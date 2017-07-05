import requests
from requests_oauthlib import OAuth1
import json
from math import *

zipcodes = ["07310", "07302", "10025", "10018"]

googleAPIURI = "https://maps.googleapis.com/maps/api/place/textsearch/json"
googleAPIKey = "AIzaSyDVXVSMqJhPnoVvMU5GgEWPttc6KlQ9SDI"
zillowAPIURI = "http://www.zillow.com/webservice/GetSearchResults.htm"
zillowAPIKey = "X1-ZWz19qauukb0uj_5nog4"
yelpURI = "https://api.yelp.com/v2/search"
yelpKeys = {'Consumer_Key': 'RaElci4NLPUnDoe7eVN9iA', 'Consumer_Secret' : 'YUdW3US_oBjc-FsIZTlomS4N8bI', 'Token' : 'Mdu5oTnKYuS99iz5ElkgHCHAE5VAG5Ut', 'Token_Secret' : 'sh2GelchPH9g98qlUvgR4VEvQE4'}

def getAllAddresses(zipcode):
	addresses = {}
	query = "apartments near " + str(zipcode)
	payload = {'key' : googleAPIKey, 'query' : query }
	response = requests.get(googleAPIURI, params=payload)
	res = response.json()
	addresses = {r['name'] : r['formatted_address'] for r in res['results']}
	return addresses

#chose not to include sort = 1 (by distance) to get a better score
def getYelpData(search, address):
	auth = OAuth1(yelpKeys['Consumer_Key'], yelpKeys['Consumer_Secret'], yelpKeys['Token'], yelpKeys['Token_Secret'])
	payload = {'term' : search, 'location' : address.replace(' ', '+'), 'sort' : 1, 'limit' : 20, 'radius_filter' : 2000}
	response = requests.get(yelpURI, auth=auth, params=payload)
	res = response.json()
	summary = dict()
	summary['businesses'] = {z['name'] : {'rating': z['rating'], 'review_count' : z['review_count'], 'distance': z.get('distance', 10000)} for z in res['businesses']}
	summary['region'] = res['region']
	summary['total'] = res['total']
	return summary

def generateJsonFiles():
	zipdict = {z : getAllAddresses(z) for z in zipcodes}
	with open('apartments.json', 'w') as f:
		json.dump(zipdict, f)
	print "Apartments Gathered!"
	yelpdict = {z : getYelpData('groceries', z) for z in reduce(lambda x,y: x+y, map(lambda w: w.values(), zipdict.values()))}
	with open('yelpDataSummary.json', 'w') as f:
		json.dump(yelpdict, f)
	print 'Yelp Data written'

def normalizeYelpScores(yelpDict):
	for z in yelpDict.keys():
		sm =  [x['review_count'] for x in yelpDict[z]['businesses'].values()]
		Q = sum(sm)/(1.0 * len(sm))
		for k in yelpDict[z]['businesses'].keys():
			yelpDict[z]['businesses'][k]['score'] = (0.5 * yelpDict[z]['businesses'][k]['rating']) + 2.5*(1 - exp(-1*yelpDict[z]['businesses'][k]['review_count']/Q))
		yelpDict[z]['max_score'] = max([yelpDict[z]['businesses'][k]['score'] for k in yelpDict[z]['businesses'].keys()])
	return yelpDict


if __name__ == "__main__":
	with open('yelpDataSummary.json', 'r') as f:
		yelpdict = json.load(f)
		yelpdict = normalizeYelpScores(yelpdict)
	with open('yelpDataSummary.json', 'w') as f:
		json.dump(yelpdict, f)
