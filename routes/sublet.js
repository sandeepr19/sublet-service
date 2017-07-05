//declaring the variables
		
var config = require("./config.js");
var mongo = require('mongodb');
var numCPUs = require('os').cpus().length;
var cluster = require('cluster');
var extend = require('node.extend');
var wait = require('wait.for');
var Server = mongo.Server,
Db = mongo.Db,
BSON = mongo.BSONPure;
var server = new Server('localhost', 27017, {auto_reconnect: true});

//declaring the required API variables for external data
var googleDistancePlugin = require('google-distance');
var yelpPlugin = require("yelp").createClient({
  consumer_key: config.yelpConsumerKey, 
  consumer_secret: config.yelpConsumerSecret,
  token: config.yelpToken,
  token_secret: config.yelpTokenSecret
});



db = new Db('subletdb', server, {safe:true});
var numOfWorkers;
var currentWorkerId;
var userCache = new Object();
var subletCache = new Object();
var cityCache = new Object();


//prepare cache for user and subletData
exports.prepareCache = function(callback){
	console.log("first cache ");
	var users;
	var cities;
	db.open(function(err){
    		db.collection('user', function(err, collection) {
			collection.find().toArray(function(err, items) {
				if(items != null ){
					users = items;
					processCacheCreation();
				}
			});
    		});

   	 	db.collection('sublet', function(err, collection) {
			collection.find().toArray(function(err,items) {
				if(items != null){
					cities = items;
					processCacheCreation();
				}	
			});    		
		});
  	});

	// to handle asynchronous collection of user and sublet data
	function processCacheCreation(){
		if(users!=null && cities!=null){
			createUserCache(users);		
			createSubletCache(cities);	
			if(Object.keys(userCache).length == users.length){
				callback("Cache completed");
			} 
		}
  	}	

} 

function createUserCache(items) {
	for(var i in items){
		var user = items[i];
		userCache[user.userName] = user;
	}
}

function createSubletCache(items) {
	for( var i in items ) {
		var city = items[i];
		cityCache[city.cityName] = city;
		var subletList = city.sublets;
		for(var i in subletList) {
			var subletObject = subletList[i];
			subletCache[subletObject.subletName]=subletObject; 
		}
	}
}

// create a wrapper for encapsulating user and city data from the cache
exports.getUserCityData = function( userName, cityName, callback ) {
	var result = new Object();
	db.collection('user', function(err,collection){
		collection.findOne({'userName':userName}, function(err, user) {
			if(user == null) callback(user);
				if(user != null ){
   					result.user = user; 
   					var item = cityCache[cityName];
 				   	if(item == null) callback(item);
				        	if(item!=null){
					        	var list = item.sublets;
							var cityObject = new Object();
							cityObject.cityName = cityName;
						  	var subletList = new Object();
	  					  	for(var i in list){
								var subletObject = list[i];
								var user = userCache[subletObject.owner];
								// encapsulating the linkedIn id of the owner of the sublet to find the social connection score analytics
								// later in the flow 
								subletList[subletObject.subletName] = user.linkedinId;		
	  					 	}
	 	 				  	cityObject.subletList = subletList;
	  					  	result.cityObject = cityObject;
	  				  		callback(result);
       				 		}
				} 
 		});
	});
}

// social connection analytics for user and city
exports.processLinkedinData = function ( resultObject ){
	// Absolute Score, Relative Score on a scale of 1..5 
	var socialDistanceObject = resultObject.socialDistanceObject;
	var absoluteScore = new Object();
	var relativeScore = new Object();
	var keys = Object.keys(socialDistanceObject);
	var lowestScore = 5;

	for( var i in keys){
		// if distance is -1 on linked in, the users are not related i.e absoulte score is -1
		if(socialDistanceObject[keys[i]] == -1) {
			absoluteScore[keys[i]] = 0;
			continue;
		}

		// Distance on linked In can be 1,2,3: Normalize the same to be 5( highest ) , 4,3 .....
		absoluteScore[keys[i]] = 6 - socialDistanceObject[keys[i]];
		if(socialDistanceObject[keys[i]] < lowestScore) lowestScore = socialDistanceObject[keys[i]];
	}

	// find the lowest score for all the sublets in terms of absolute social connection score
	// if all sublets in the city are not related to the buyer, then absolute score would be 0 fr all the sublets, in such a case, 
	// just initalize the lowest score as 1, this would then get a relative score of 5
	if (lowestScore == 5 ) lowestScore =1;
	var factor = 5 - (6 - lowestScore);
	var subletSocialScoreMap = new Object();
	for ( var i in keys){
		relativeScore[keys[i]] = absoluteScore[keys[i]] + factor;
		var subletScoreObject = new Object();
		subletScoreObject.socialConnectionScore = socialDistanceObject[keys[i]];
		subletScoreObject.normalizedSocialConnectionScore = absoluteScore[keys[i]] + relativeScore[keys[i]];
		subletSocialScoreMap[keys[i]] = subletScoreObject;
	}

	var userAnalyticsRecord = new Object();

	// insert/ update in the DB
	db.collection('userAnalytics', function(err,collection){
    		collection.findOne({'userName': resultObject.user.userName, 'cityName' : resultObject.cityObject.cityName}, function(err, dataRecord) {
 			if( dataRecord != null ){
				console.log('updating record');
				userAnalyticsRecord = dataRecord;
			} else {
				console.log('new record');
				userAnalyticsRecord.userName = resultObject.user.userName;
				userAnalyticsRecord.cityName = resultObject.cityObject.cityName;
    			}	
    			userAnalyticsRecord.socialConnections = subletSocialScoreMap;
    			collection.save(userAnalyticsRecord, function (err, result) {
    			});	
  		});
	});
}

// for travelling distance score for user and city
exports.processTravellingDistanceData = function ( userName, cityName, callback){
	var userAnalyticsRecord = new Object();
	db.collection('user', function(err, collection){
		collection.findOne({'userName':userName}, function(err, userRecord) {
			if(userRecord == null) callback(userRecord);
	 	 	if(userRecord!=null){
				var cityObject = cityCache[cityName];
				if(cityObject == null) callback(cityObject);
				if(cityObject != null) {
					obtainGoogleDistanceForEachSublet(userRecord, cityObject, function(result){
						if(result!=null) {
							callback("Processing");
							calculateTravellingDistanceAnalytics(result, function(analyticsResult){
								if(analyticsResult != null){
									db.collection('userAnalytics', function(err,collection){
										collection.findOne({'userName': userName, 'cityName' : cityName}, function(err, dataRecord) {
    											if( dataRecord != null ){
												console.log('updating record');
												userAnalyticsRecord = dataRecord;
					    						} else {
												console.log('new record');
												userAnalyticsRecord.userName = userName;
												userAnalyticsRecord.cityName = cityName;
    											}	
    											userAnalyticsRecord.travellingDistance = analyticsResult;
    											collection.save(userAnalyticsRecord, function (err, result) {
    											});	
  										});
									});
								}				
							});
						}
					});
				}
  			}	
		});
	});
}


// calculate the normalized travelling distance score for sublet
function calculateTravellingDistanceAnalytics (travellingDistanceObject, callback){
	var keys = Object.keys(travellingDistanceObject);
	var absoluteDistanceScore = new Object();
	var relativeDistanceScore = new Object();
	var highestDistance = 0;
	var lowestDistance = 100;
	for(var i in keys){
		absoluteDistanceScore[keys[i]] = 5 - (travellingDistanceObject[keys[i]].travellingDistanceScore/5);
		if(absoluteDistanceScore[keys[i]] < 0 ) absoluteDistanceScore[keys[i]] = 0;
		if(Number(travellingDistanceObject[keys[i]].travellingDistanceScore) > highestDistance ) highestDistance = travellingDistanceObject[keys[i]].travellingDistanceScore;
		if(Number(travellingDistanceObject[keys[i]].travellingDistanceScore) < lowestDistance ) lowestDistance = travellingDistanceObject[keys[i]].travellingDistanceScore; 
	}
	var distanceFactor = highestDistance - lowestDistance;
	for(var i in keys){
		relativeDistanceScore[keys[i]] = 5 - (((travellingDistanceObject[keys[i]].travellingDistanceScore - lowestDistance) / distanceFactor) * 5);			
		travellingDistanceObject[keys[i]].normalizedTravellingDistanceScore = absoluteDistanceScore[keys[i]] + relativeDistanceScore[keys[i]];
	}

	callback(travellingDistanceObject);
}

//obtain distance for each sublet using google distance API
function obtainGoogleDistanceForEachSublet(user, cityObject, callback) {
	console.log("function called for each sublet");
	var travellingDistanceObject = new Object();
	var sublets = cityObject.sublets;
	var location = user.impLocation;
	for(var i in sublets) {
		(function(j){
			var sublet = sublets[j];
			var subletObject = new Object();
			googleDistancePlugin.get(
			{
 				origin: sublet.address,
 				destination: location 
			},function(err, data) {
 				var distance;
 				if (err) { 
					distance= 0;
 				}else {
			   		var res = (data.distance).split(" ")
				   	distance = res[0];
 				}
 				subletObject.travellingDistanceScore = distance;
 				travellingDistanceObject[sublet.subletName] = subletObject;
 				if(Object.keys(travellingDistanceObject).length == sublets.length){
					callback(travellingDistanceObject);
 				}
			});
		})(i);
	}
}


// for sublet analytics ( night life and utilities)
exports.processSubletAnalytics = function(workerId, numCPUs, callback) {
	numOfWorkers = numCPUs;
	currentWorkerId = workerId;
	if(cityCache!=null) {
		console.log("City Cache length " + Object.keys(cityCache).length );
		console.log("number of workers " + numOfWorkers );	
	    	if( ( Object.keys(cityCache).length / numOfWorkers  ) < 1) {
			if( currentWorkerId == 1 ) {
				console.log('processing sublet data');	
				setNightLifeAndUtilityScore(function (result){
				//if(result!=null) callback(result);
			 	});
	 		}
    		} else {
			var cityCacheLength = Object.keys(cityCache).length;
			var factor = Math.round(cityCacheLength / numOfWorkers);		
			var start = (currentWorkerId -1) * factor;
			var end = ((start + factor) > cityCacheLength ) ? cityCacheLength : (start + factor) ;
			//var modifiedSubletCollection = subletCollection.slice(start, end);
			for(var i = start; i < end ; i++ ) {
			}
		}
	}
	callback('success');
}

// for sublet analytics ( night life and utilities)
function setNightLifeAndUtilityScore( callback){
	var keys = Object.keys(cityCache);
	var cityCounter;
   	for( var i in keys) {
		(function(j){
     			var currentCity = cityCache[keys[j]];
     			obtainYelpDataForCity( currentCity, function(cityObject){
				if(cityObject!=null) {
					calculateNormalizedScoreForCity(cityObject, function(result){
						if(result!=null){
							db.collection('subletAnalytics', function(err, collection){
								collection.findOne({'cityName': result.cityName}, function(err, city) {
									if(city!=null) {
										result['_id'] = city['_id'];
									}	
									collection.save(result, function(err,result){
										if(result !=null)		
										{
											cityCounter = cityCounter + 1;
			  								if(Object.keys(cityCache).length == cityCounter) 
												calback('success'); 
										}
									});
								});
							});
	   					}
	  				});
				}
     			});
    		})(i);
   	}
}

// for sublet analytics ( night life and utilities)
function calculateNormalizedScoreForCity(cityObject, callback){
	var keys = Object.keys(cityObject);
	var absoluteNightLifeScore = new Object();
	var absoluteUtilitiesScore = new Object();
	var relativeNightLifeScore = new Object();
	var relativeUtilitiesScore = new Object();

	var highestNightLifeScore = 0;  
	var lowestNightLifeScore = 25; 
	var highestUtilitiesScore = 0;
	var lowestUtilitiesScore = 10;

	//absolute Score for Utilities and Night Life
	for(var j in keys){
		(function(i){
			if(keys[i] != 'cityName') {
				var key = keys[i];
				var subletObject = cityObject[key];
				absoluteNightLifeScore[key] = (subletObject.nightLifeScore)/5;
				absoluteUtilitiesScore[key] = (subletObject.utilitiesScore)/2; 
				if(subletObject.nightLifeScore > highestNightLifeScore) 
					highestNightLifeScore = subletObject.nightLifeScore;
				if(subletObject.nightLifeScore < lowestNightLifeScore) 
					lowestNightLifeScore = subletObject.nightLifeScore;
				if(subletObject.utilitiesScore > highestUtilitiesScore) 
					highestUtilitiesScore = subletObject.utilitiesScore; 
				if(subletObject.utilitiesScore < lowestUtilitiesScore) 
					lowestUtilitiesScore = subletObject.utilitiesScore; 

			}
		})(j);
	}

	var nightLifeDivider = highestNightLifeScore - lowestNightLifeScore;
	var utilitiesDivider = highestUtilitiesScore - lowestUtilitiesScore;

	for(var j in keys){
		(function(i){
			var key = keys[i];
			if(key != 'cityName') {
				var subletObject = cityObject[key];
				var relativeNightLifeScore = ((subletObject.nightLifeScore - lowestNightLifeScore )/ nightLifeDivider) * 5;
				var relativeUtilitiesScore = ((subletObject.utilitiesScore - lowestUtilitiesScore )/ utilitiesDivider) * 5; 
				subletObject.normalizedNightLifeScore = absoluteNightLifeScore[key] + relativeNightLifeScore;
				subletObject.normalizedUtilitiesScore = absoluteUtilitiesScore[key] + relativeUtilitiesScore;
			}
		})(j);
	}

	callback(cityObject);
}

//
function obtainYelpDataForCity( currentCity, callback) {
	var cityObject = new Object();
     	var sublets = currentCity.sublets;
	for(var i in sublets ) {
       		(function(j){
       			var sublet = sublets[j];
       			var subletObject = new Object();
       			var location = sublet.address;
       			yelpPlugin.search({location: location, radius_filter: 800,category_filter: "nightlife", limit: 5, sort: 2 }, function(error, yelpNightLifeData) {
       				yelpPlugin.search({location: location, radius_filter: 500,category_filter: "grocery", limit: 10, sort: 1}, function(error, yelpGroceriesData) {
 	   				var businessList = yelpNightLifeData.businesses;
	   				var yelpRatingSum = 0;
	   				for( var i in businessList ) {
						var business = businessList[i];
						yelpRatingSum = yelpRatingSum + business.rating;
	   				}
	   				subletObject.nightLifeScore = yelpRatingSum;
	   				var groceriesList = yelpGroceriesData.businesses;
	  				subletObject.utilitiesScore = groceriesList.length; 
           				cityObject[sublet.subletName] = subletObject;
	   				if(Object.keys(cityObject).length == sublets.length) {
     						cityObject.cityName = currentCity.cityName;
						callback(cityObject);
	   				}	
  	   			});
       			});
      		})(i);
   	}
}

/* An API that finds the ecoystem for a given city
   Basically find the ranking of factors ( 1:2:3:4...) for which the sum of cumulative score for all the factors for a given sublet would be the highest 
   for a city and save that in the DB
*/
exports.findRankingEcosystemForCity = function(userName,cityName, callback) {
	var factors;
   	var userAnalyticsRecord;
   	var subletAnalyticsRecord;
	
	// retrieve the user record from the user cache
  	if(userCache[userName] == null){
		callback("User invalid");
		return 0;
  	}
  
	// retrieve the city record from the cache
 	if(cityCache[cityName] == null){
		callback("City invalid");
		return 0;
  	}

   	var scoreMapping;
	// obtain the reference data ( all the score factors involved : Travelling Distance, Utilities, Night life, Social Connections ) 
   	db.collection('referenceData', function(err, collection) {
        	collection.findOne({'key':'scoreFactors'}, function(err, item) {
	 		if(item!=null) {
	   			factors = item; 
 	   			aggregateData();
	 		}
         	});
      	});
   
	// obtain the sublet analytics record from the city
	db.collection('subletAnalytics', function(err, collection) {
        	collection.findOne({'cityName':cityName}, function(err, result) {
		 	if(result != null) {
	 			subletAnalyticsRecord = result;
	 			aggregateData();
	 		}
        	});
      	});
	
	// obtain the user analytics record from the db
   	db.collection('userAnalytics', function(err, collection) {
		collection.findOne({'userName':userName, 'cityName':cityName}, function(err, result){
			if(result != null) {
				userAnalyticsRecord = result;
				if(userAnalyticsRecord == null) callback("Missing user analytics.");
					aggregateData();
				}
			});
      	});    

   
   	//create input in a particular format for the computation algorithm
   	function createInputRecord( userObject, subletAnalyticsObject){
		var socialConnectionObject = userObject.socialConnections;
		var travellingDistanceObject = userObject.travellingDistance;
		if(travellingDistanceObject == null) {
			callback("No travelling distance data for user and city: " + userName + " " + cityName);
			return null;
		}
		if(socialConnectionObject == null) { 
			callback("No social connection data for user and city: " + userName + " " + cityName);
			return null;
		}
		var keys = Object.keys(socialConnectionObject);
		var inputRecord = new Object();
		for(var i in keys){
			var subletObject = new Object();
			subletObject.normalizedSocialConnectionScore = socialConnectionObject[keys[i]].normalizedSocialConnectionScore; 
			subletObject.normalizedTravellingDistanceScore = travellingDistanceObject[keys[i]].normalizedTravellingDistanceScore;
			subletObject.normalizedNightLifeScore = subletAnalyticsObject[keys[i]].normalizedNightLifeScore;
			subletObject.normalizedUtilitiesScore = subletAnalyticsObject[keys[i]].normalizedUtilitiesScore;
			inputRecord[keys[i]] = subletObject;
		}
		return inputRecord;
   	}	   

   	//aggregate all data obtained from asynchronous callbacks	
   	function aggregateData() {
		var defaultArray = new Array();
		if (factors!=null && subletAnalyticsRecord != null && userAnalyticsRecord != null) {
			var subletScoreWrapper = createInputRecord(userAnalyticsRecord, subletAnalyticsRecord);
	  		if(subletScoreWrapper == null){
				return null;	
	  		}
	  		scoreFactors = new Array();
			scoreFactors = factors['values'];
          		inputRankingMap = new Array();
   	  		inputRankingMap = createInputRankingMap(scoreFactors);
	  		outputRankingMap = new Object();
	  		score = obtainBestScoreForCity(defaultArray, factors['values'],subletScoreWrapper, factors['values'].length, inputRankingMap, outputRankingMap);
	  		console.log(subletScoreWrapper);
	  		console.log("Score " + score );
	  		console.log(outputRankingMap);
	  		var cityEcosystemRecord = new Object();
			// insert / update the DB with the eco system record for the user/ city
	  		db.collection('userCityEcosystem', function(err,collection){
				collection.findOne({'userName': userName, 'cityName' : cityName}, function(err, dataRecord) {
    					if( dataRecord != null ){
		  				console.log('updating record');
		  				cityEcosystemRecord = dataRecord;
    	        			} else {
		  				console.log('new record');
		  				cityEcosystemRecord.userName = userName;
		  				cityEcosystemRecord.cityName = cityName;
    					}	
    		  			cityEcosystemRecord.rankingMap = outputRankingMap;
    		  			collection.save(cityEcosystemRecord , function (err, result) {});	
  				});
			});
	  		callback(outputRankingMap);
		}
   	}	
}

function createInputRankingMap (scoreFactors) {
	inputRankingMap = new Array();
	for( var i = 0;i<scoreFactors.length;i++) {
   		inputRankingMap[scoreFactors[i]] = new Array();
	}
	return inputRankingMap;
}

function calculateScore(finalScoreMap, subletScoreWrapper, factor, multiplier) {
	var score = 0;
	var keys = Object.keys(subletScoreWrapper);
	for ( var i in keys ) {
		score= (score) + Number(subletScoreWrapper[keys[i]][factor]);
	}
	score= score * multiplier;
	finalScoreMap[factor][multiplier] = score;
	return score;
}
 
//obtan the best score for a city and identify the ranking to obtain the highesr score
function obtainBestScoreForCity ( selectedFactor, factorArray, scoreMapping, multiplier, finalScoreMap, finalQueue){
	var maxScore = 0;
	var currentQueue = new Object();
	for( var i = 0; i< factorArray.length; i++ ) {
		var tempQueue = new Object();
		if( selectedFactor.indexOf(factorArray[i]) == -1 ) {
			selectedFactor.splice(selectedFactor.length,0,factorArray[i]);	
		   	tempQueue[factorArray[i]] = multiplier;
		   	obtainedScore = obtainBestScoreForCity(selectedFactor,factorArray,scoreMapping, (multiplier -1), finalScoreMap, tempQueue);
		   	if(finalScoreMap[factorArray[i]][multiplier] == undefined ){
				calculatedScore = calculateScore(finalScoreMap, scoreMapping, factorArray[i], multiplier);
		   	} else {
				calculatedScore = finalScoreMap[factorArray[i]][multiplier];
		   	}
		   	currentScore = obtainedScore + Number(calculatedScore);
		   	if ( currentScore > maxScore ) {
				currentQueue = extend(currentQueue, tempQueue);
				maxScore = currentScore;
		   	}
		   	selectedFactor.pop();
		}
	} 
	if( Object.keys(currentQueue).length != 0 ) {
		finalQueue = extend(finalQueue, currentQueue);
	}
	return maxScore;
}

// An API that finds all the users from the DB
exports.findAllUsers = function(req, res) {
	db.collection('user', function(err, collection) {
		collection.find().toArray(function(err, items) {
			res.send(items);
		});
    	});
};

// An API that finds all the sublets for a city
exports.findAllSubletsForCity = function(req, res) {
	var cityName = req.params.cityName;
     	console.log("find all city names" + cityName);
     	db.collection('sublet', function(err, collection) {
        	collection.findOne({'cityName':cityName}, function(err, item) {
	     		if(item == null) { 
				res.send('No sublets present for the city');
	     		} else {
             			res.send(item);
	     		}
         	});
      	});
};

// An API that retrieves the analytics for a given user and city
exports.findUserAnalytics = function( req,res){
	db.collection('userAnalytics', function(err,collection){
		collection.findOne({'userName':req.params.userName, 'cityName' : req.params.cityName} , function(err, item) {
			if(item == null) {
				res.send('No analytics for user and city');
			} else {
				res.send(item);
			}
		});
	});
};

// An API that retrieves the sublet analytics from the DB for a given city
exports.findSubletAnalyticsForCity = function ( req, res) {
	db.collection('subletAnalytics', function(err,collection){
		collection.findOne({'cityName':req.params.cityName}, function(err, item){
	  		if(item == null){
				res.send('No analytics for current city');
	  		} else {
				res.send(item);
	  		}
		});
    	});
};

/* An API to obtain the cumulative score for all the sublets in a city based on the city's ecosystem stored in the DB 
   Score = For given user and city : Sum ( For each sublet ( Score of factor * ranking of factor based on the eco system stored in the db ) )
*/
exports.getSubletScoreForCityEcosystem = function(userName, cityName, callback){
	var ecoSystemRecord;
	var userAnalyticsRecord;
	var subletAnalyticsRecord;

	// obtain the record from the userCityEcosystem table in the DB
	db.collection('userCityEcosystem', function(err,collection){
		collection.findOne({'cityName':cityName,'userName':userName}, function(err, item){
	 		ecosystemRecord = item;
	 		calculateScore();
		});
	});
   
	// obtain the analytics record for the sublets in the given city
   	db.collection('subletAnalytics', function(err, collection) {
        	collection.findOne({'cityName':cityName}, function(err, result) {
	 		subletAnalyticsRecord = result;
	 		calculateScore();
         	});
      	});
	
	// obtain the analytics record for all the sublets for the given user and the given city
   	db.collection('userAnalytics', function(err, collection) {
		collection.findOne({'userName':userName, 'cityName':cityName}, function(err, result){
			userAnalyticsRecord = result;
	 		calculateScore();
		});
      	});

	/* On obtaining all of the three records from the DB , the calculateScore method is called which calculates the cumulative 
	   score for each sublet for the city
	*/
	function calculateScore(){
		if(ecosystemRecord != null && subletAnalyticsRecord != null && userAnalyticsRecord !=  null) {
			var outputObject = new Object();
			var rankingMap = ecosystemRecord.rankingMap;
			var socialConnectionObject = userAnalyticsRecord.socialConnections;
			var travellingDistanceObject = userAnalyticsRecord.travellingDistance;
			var keys = Object.keys(socialConnectionObject);
			var inputRecord = new Object();
			for(var i in keys){
				var subletObject = new Object();
				subletObject.normalizedSocialConnectionScore = socialConnectionObject[keys[i]].normalizedSocialConnectionScore; 
				subletObject.normalizedTravellingDistanceScore = travellingDistanceObject[keys[i]].normalizedTravellingDistanceScore;
				subletObject.normalizedNightLifeScore = subletAnalyticsRecord[keys[i]].normalizedNightLifeScore;
				subletObject.normalizedUtilitiesScore = subletAnalyticsRecord[keys[i]].normalizedUtilitiesScore;
				var totalScore = 0;
				var factorKeys = Object.keys(subletObject);	
				for(var j in factorKeys){
					totalScore = totalScore + (Number(rankingMap[factorKeys[j]]) * Number(subletObject[factorKeys[j]]) );
				}
				subletObject.totalScore = totalScore;
				subletObject.address = subletCache[keys[i]].address;
				outputObject[keys[i]] = subletObject;
			}	
			callback(outputObject);
		}
   	}
}

/* An API to get the cumulative sublet score for a city based on a user's preferences stored in the DB
   Score = For a given city and user : Sum(For each sublet in the city ( Score for factor * Ranking of the factor based on the user's preferences ))
   TODO: This method is currently incomplete. Ideally it would be pulling out all the analytics for the sublet
   and the user, multiplying the scoring factors by the user preferences and sorting out the cumulative scores for each sublet
*/  	 
exports.getSubletScoreForUserPreferences = function(userName, cityName, callback){
	var userPreferences;
	var userAnalyticsRecord;
	var subletAnalyticsRecord;

	db.collection('userCityEcosystem', function(err,collection){
		collection.findOne({'cityName':cityName,'userName':userName}, function(err, item){
	 		ecosystemRecord = item;
		});
	});
   
   	db.collection('subletAnalytics', function(err, collection) {
        	collection.findOne({'cityName':cityName}, function(err, result) {
	 		subletAnalyticsRecord = result;
         	});
        });
	
   	db.collection('userAnalytics', function(err, collection) {
		collection.findOne({'userName':userName, 'cityName':cityName}, function(err, result){
			userAnalyticsRecord = result;
		});
      	});
}

