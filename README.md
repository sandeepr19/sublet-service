# sublet-service

Sample output

Ranking for a city
{   
"normalizedNightLifeScore": 3,   
"normalizedSocialConnectionScore": 4,   "normalizedTravellingDistanceScore": 1,   
"normalizedUtilitiesScore": 2 
}

Score of sublets for a given city

{   
"NewYork_apartment1": {     "normalizedSocialConnectionScore": 10,     "normalizedTravellingDistanceScore": 0.204081632653061,     "normalizedNightLifeScore": 8.545454545454545,     "normalizedUtilitiesScore": 7.5,     "totalScore": 80.8404452690167,     "address": "248 West, 105th Street, New York City, New York, NY, 10025"   },   
"NewYork_apartment5": {     "normalizedSocialConnectionScore": 8,     "normalizedTravellingDistanceScore": 0.6122448979591839,     "normalizedNightLifeScore": 0,     "normalizedUtilitiesScore": 2.25,     "totalScore": 37.11224489795919,     "address": "2414 Mickle Ave Bronx, NY 10469"   },   
"NewYork_apartment3": {     "normalizedSocialConnectionScore": 6,     "normalizedTravellingDistanceScore": 0,     "normalizedNightLifeScore": 3.631818181818182,     "normalizedUtilitiesScore": 0.5,     "totalScore": 35.89545454545454,     "address": "266 E 46th St Brooklyn, NY, 11203"   },   
"NewYork_apartment2": {     "normalizedSocialConnectionScore": 8,     "normalizedTravellingDistanceScore": 0.040816326530611846,     "normalizedNightLifeScore": 8.972727272727273,     "normalizedUtilitiesScore": 7.5,     "totalScore": 73.95899814471242,     "address": "83 Gold St New York, NY 1003"   },   
"NewYork_apartment4": {     "normalizedSocialConnectionScore": 10,     "normalizedTravellingDistanceScore": 0.14285714285714324,     "normalizedNightLifeScore": 9.4,     "normalizedUtilitiesScore": 7.5,     "totalScore": 83.34285714285716,     "address": "515 W 59th St, New York, NY 1001"   } }





How to run the APP

1)	Run the mongod command to start up mongodb : mongodb/bin/mongod
2)	Run the node command inside the folder where your server file has been placed : node server.js 
3)	If you want to check the DB in mongodb : mongodb/bin/mongo 
4)	Mongo DB wiki : http://mongodb.github.io/node-mongodb-native/api-articles/nodekoarticle1.html
5)	You have to run the following command initially after starting the server ( as the linked in API needs an Authentication token ) :
http://localhost:3000/auth/linkedin
The above command will make sure you’ve logged into linkedIn , You can now use any of the API’s and check the data on the browser

API’s for use

1)	http://Localhost:3000/userAnalytics/”userName”/”cityName” : Find the analytics for a given user and given city
2)	http://Localhost:3000/subletAnalytics/”cityName” : Find the analytics for the given city name
3)	http://Localhost:3000/subletAnalytics/users : Find all the users
4)	http://Localhost:3000/subletsForCity/”cityName” : Find all the sublets for the given city
5)	http://Localhost:3000/getSubletScoreForUserPreferences/”username”/”cityname” : find the sublet score for a given city name and user name
6)	http://Localhost:3000/getCityRanking/”username”/”cityname”: find the ranking of all the factors for a given city and user
7)	http://Localhost:3000/getSubletScoreForCityEcosystem/”username”/”cityname”  : get the sublet score for a given city and user based on the city’s ranking ecosystem
8)	http://Localhost:3000/refreshTravellingDistanceScore/”username”/”cityname” : refresh the travelling distance score for a user and a city name
9)	http://Localhost:3000/refreshSocialConnectionScore/”username”/”cityname” : refresh the social connection score based on city name and user
