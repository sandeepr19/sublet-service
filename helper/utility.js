/*
This class provides a helper utility to insert data in the tables in  mongo db
It has been configured to use port 27017
*/

var mongo = require('mongodb');
var Server = mongo.Server;
var Db = mongo.Db;
BSON = mongo.BSONPure;
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('subletdb', server, {safe:true});

//populate the database
exports.populateDb = function(){
db.open(function (err, db){
populateDB();
db.close();
});
}

// collections to insert data
var populateDB = function () {
	console.log("Inserting data");
	//user table ( Data will be inserted by user actions )
	var user = [
	{
		userName : "sandeepr19",
		firstName : "sandeep",
		lastName : "ranganathan",
		password : "abcd",
		preferences : "", 
		linkedinId: "d-9ZDAVd-a",
		impLocation : "Recycle Studio South End 643A Tremont St Boston, MA 02118",
		cities : ["New York City","Jersey City","Boston"], 
		roles : ["subletee"],
		
	},
	{
		userName : "nishantk19",
		firstName : "nishant",
		lastName : "kanakia",
		password : "abcd",
		preferences : "", 
		linkedinId: "Qygg5b3XIM",
		impLocation : "Columbia University, 116th Street, New York, NY 10027",
		cities : ["New York City","Jersey City"], 
		roles : ["subletee"],
		
	},
	{
		userName : "chintans19",
		firstName : "chintan",
		lastName : "shah",
		password : "defg",
		preferences : "",
		linkedinId: "UcGgujsAwz",
		impLocation : "Recycle Studio South End 643A Tremont St Boston, MA 02118",
		cities : ["Boston", "Jersey City"],
		roles : ["subletee"],
	},
	{
		userName : "imranp19",
		firstName : "imran",
		lastName : "parekh",
		password : "pearl",
		preferences : "",
		linkedinId: "WDpBfIPIej",
		impLocation : "",
		cities : [],
		roles : ["subletter"],
	},
	{
		userName : "sunnyn19",
		firstName : "sunny",
		lastName : "nagpal",
		password : "defg",
		preferences : "",
		linkedinId: "vqMU6JAeba",
		impLocation : "",
		cities : [],
		roles : ["subletter"],
	},
	{
		userName : "meethum19",
		firstName : "meethu",
		lastName : "malu",
		password : "pact",
		preferences : "",
		linkedinId: "6h8VdAmUzL",
		impLocation : "",
		cities : ["New York City", "Jersey City"],
		roles : ["subletter"],
	}	
	];
	
	// sublet table ( Data will be inserted by server )
	var sublet = [
	{
		cityName: "New York City",
		sublets : [ {
			subletName : "NewYork_apartment1",
			address : "248 West, 105th Street, New York City, New York, NY, 10025",
			owner: "meethum19",
			coordinates : ["40.800399", "-73.968452"],
			},
			{
			subletName : "NewYork_apartment2",
			address : "83 Gold St New York, NY 1003",
			owner: "imranp19",
			coordinates : ["40.710127", "-74.004898"],
			},
			{
			subletName : "NewYork_apartment3",
			address : "266 E 46th St Brooklyn, NY, 11203",
			owner: "sunnyn19",
			coordinates : ["40.655574", "-73.934918"],
			},
			{
			subletName : "NewYork_apartment4",
			address : "515 W 59th St, New York, NY 1001",
			owner: "meethum19",
			coordinates : ["40.771061", "-73.988538"],
			},
			{
			subletName : "NewYork_apartment5",
			address : "2414 Mickle Ave Bronx, NY 10469",
			owner: "imranp19",
			coordinates : ["40.861405", "-73.840560"],
			},
			],
	},
	{
		cityName: "Boston",
		sublets : [ {
			subletName : "Boston_apartment1",
			address : "78 Marlborough St Boston, MA 0211",
			owner: "meethum19",
			coordinates : ["42.353591", "-71.075525"],
			},
			{
			subletName : "Boston_apartment2",
			address : "125-199 E Dedham St Boston, MA 02118",
			owner: "imranp19",
			coordinates : ["40.710127", "-74.004898"],
			},
			{
			subletName : "Boston_apartment3",
			address : "15 New Sudbury St Boston, MA 02203",
			owner: "sunnyn19",
			coordinates : ["42.360900", "-71.059862"],
			},
			{
			subletName : "Boston_apartment4",
			address : "95 Fargo St Boston, MA 02210",
			owner: "meethum19",
			coordinates : ["42.360900", "-71.059862"],
			},
			{
			subletName : "Boston_apartment5",
			address : "246 W Newton St Boston, MA 02116",
			owner: "imranp19",
			coordinates : ["42.344305", "-71.080898"],
			},
			],
	},

	{
		cityName: "Jersey City",
		sublets : [ {
			subletName : "JerseyCity_apartment1",
			address : "Avalon Cove, 444 Washington Blvd, Jersey City, NJ 07310",
			owner: "imranp19",
			coordinates : ["40.723410","-74.035119"],
			},
			{
			subletName : "JerseyCity_apartment2",
			address : "180, 10th Street, Jersey City, NJ 07302",
			owner: "meethum19",
			coordinates : ["40.729036", "-74.040998"],
			},
			{
			subletName : "JerseyCity_apartment3",
			address : "631 Court St ,Hoboken, NJ, 0703",
			owner: "sunnyn19",
			coordinates : ["40.744037", "-74.028413"],
			},
			{
			subletName : "JerseyCity_apartment4",
			address : "253 Newark Ave, Jersey City, NJ , 07302",
			owner: "meethum19",
			coordinates : ["40.722551", "-74.048488"],
			},
			{
			subletName : "JerseyCity_apartment5",
			address : "68 Van Reipen Ave, Jersey City, NJ 07306",
			owner: "sunnyn19",
			coordinates : ["40.733921", "74.062404"],
			},
			],
	}];

	// data to indicate the buyer / seller of a transaction ( Data will be inserted by user actions )
	var userSubletTransaction = [
	{
		userId : "sandeepr19",
		subtletName : "rooseVelt",

	}];

	// table to store analytics related to a sublet ( Night Life score and Utilities Score )( Data will be inserted by user actions ) 
	var subletAnalytics = [
	{
		/*
		cityName : "Jersey City",
		'JerseyCity_apartment1' : [{
		nightLifeScore :"" ,
		normalizedNightLifeScore :"" ,
		utilitiesScore :"" ,
		normalizedUtilitiesScore :"" ,
		}]
		*/
	},];

	// table to store all the analytics with respect to a user for a sublet ( Travelling Distance Score / Social Connection Score ) ( Data will be inserted by user actions ) 
	var userAnalytics = [
	{
	/*
		userName : "sandeepr19",
		cityName : "Jersey City",
		socialConnections :[{
		'JerseyCity_Apartment1':[{
		socialConnectionScore : "",
		normalizedSocialConnectionScore : "",
		}],
		}],
		travellingDistance : [{
		'JerseyCity_Apartment1':[{
		'travellingDistanceScore':"",
		'normalizedTravellingDistanceScore':"",
		}],
		}],
	*/
	}];

	// Ranking of the score factors for a City for a  User ( Data will be inserted by user actions ) 
	var userCityEcosystem = [
	{
	}];

	// Reference Data of the score factors and other key terms ( Data will be inserted by helper class/ server ) 
	var referenceData = [
	{
		key : 'scoreFactors',
		values : [ "normalizedNightLifeScore", "normalizedSocialConnectionScore", "normalizedTravellingDistanceScore", "normalizedUtilitiesScore" ]
	},
	{
		key : 'role',
		values : [ "subletter", "subletee"]
	}	
	];


	db.collection('sublet', function(err, collection) {
		collection.insert(sublet, {safe:true}, function(err, result) {});
	});	

	db.collection('user', function(err, collection) {
		collection.insert(user, {safe:true}, function(err, result) {});
	});
	
	db.collection('userSubletTransaction', function(err, collection) {
		collection.insert(userSubletTransaction, {safe:true}, function(err, result) {});
	});

	db.collection('referenceData', function(err, collection) {
		collection.insert(referenceData, {safe:true}, function(err, result) {});
	});


	db.collection('userAnalytics', function(err, collection) {
		collection.insert(userAnalytics, {safe:true}, function(err, result) {});
	});

	db.collection('subletAnalytics', function(err, collection) {
		collection.insert(subletAnalytics, {safe:true}, function(err, result) {});
	});
	
	db.collection('userCityEcosystem', function(err, collection) {
		collection.insert(userCityEcosystem, {safe:true}, function(err, result) {});
	});


};





