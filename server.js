//initializing all variables

var express = require('express'),
path = require('path'),
passport = require('passport'),
LinkedinStrategy = require('passport-linkedin-oauth2').Strategy,	
http = require('http'),
util = require('util'),
sublet = require('./routes/sublet.js'),
cluster = require('cluster'),
helper = require('./helper/utility.js');

var access_token;
var app = express();
var linkedin;

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));


//Linkedin token
var LINKEDIN_API_KEY = "9dpl6wmrr57o";
var LINKEDIN_SECRET_KEY = "hFe8WXkTsf85pFja";

//provided by LinkedIn
var Linkedin = require('node-linkedin')(LINKEDIN_API_KEY, LINKEDIN_SECRET_KEY, 'http://localhost:3000/auth/linkedin/callback"');
passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

// provided by LinkedIN
passport.use(new LinkedinStrategy({
    clientID:     LINKEDIN_API_KEY,
    clientSecret: LINKEDIN_SECRET_KEY,
    callbackURL:  "http://localhost:3000/auth/linkedin/callback",
    scope:        [ 'r_basicprofile', 'r_emailaddress'],
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
  	// asynchronous verification, for effect...
    	req.session.accessToken = accessToken;
    	linkedin = Linkedin.init(req.session.accessToken);
    	process.nextTick(function () {
    		return done(null, profile);
    	});
  }
));

app.get('/', function(req, res){
	res.render('index', { user: req.user });
});

// provided by LinkedIN
app.get('/account', ensureAuthenticated, function(req, res){
	res.render('account', { user: req.user });
});

// Call this immediately after you start the server to initialize the linkedin token
// provided by LinkedIN
app.get('/auth/linkedin',
 	 passport.authenticate('linkedin', { state: 'SOME STATE'}),
  	 function(req, res){
    	 // The request will be redirected to Linkedin for authentication, so this
    	 // function will not be called.
  	 });

//provided by linkedIn
app.get('/auth/linkedin/callback',passport.authenticate('linkedin', { failureRedirect: '/login'}),
  	function(req, res) {
    		res.redirect('/');
  	});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

// obtain linked in profile for logged in person
//provided by linkedIn
app.get('/profile', function(req,res){
	linkedin.people.me(['id', 'first-name', 'last-name'], function(err, $in) {
		console.log('profile' + $in);
   		res.send($in);
	});
});

//refresh social connection score for current user and city
app.get('/refreshSocialConnectionScore/:name/:city',function(req, res) {
	// first obtain the user and city data for the given username and cityname 
	var userSubletCollection = sublet.getUserCityData(req.params.name, req.params.city, function(result){
		if(result == null) {
			res.send('No data found for user and city');
		} else {
			// send a message to the console while the data is being processed
			res.send("Processing social connection score");
			var cityObject = result.cityObject;
			var subletList = cityObject.subletList;
			var keys = Object.keys(subletList);
			var socialDistanceObject = new Object;
			// for each sublet present in the given city, process the social distance score for the given user
			for( var i in keys) 
			{
				(function(j){
					// use the linkedin API to find the DFS distance between the buyer(current user ) / seller for a sublet
				 	linkedin.people.id(subletList[keys[j]], ['first-name', 'distance'], function(err, $in) {
		 				socialDistanceObject[keys[j]] = $in.distance;
						if(Object.keys(socialDistanceObject).length == keys.length) {
		   					result.socialDistanceObject = socialDistanceObject;
							//process analytics on the data 
		   					sublet.processLinkedinData(result);
		 				}
					});
				})(i);
	      		}
		
		}
	});
});

// refresh travelling distance score for current user and city
app.get('/refreshTravellingDistanceScore/:userName/:cityName', function (req,res) {
	sublet.processTravellingDistanceData(req.params.userName, req.params.cityName, function (result){
		if(result == null) {
			res.send("No data available for user and city");
		} else {
			res.send("Processing travelling distance score for user and city");
		}
	}); 
});

// find the best rankings for a set of scoring factors using which the cumulative score for all the sublets for all the factors would be highest
// for a city 
app.get('/getCityRanking/:name/:city', function (req, res) {
	sublet.findRankingEcosystemForCity(req.params.name, req.params.city, function(result){
		res.send(result);
	});
});

/* For a given city, find the scores for all the sublets as per the city ecosystem rankings
*/
app.get('/getSubletScoreForCityEcosystem/:user/:city',function(req,res) {
	sublet.getSubletScoreForCityEcosystem(req.params.user, req.params.city, function(result){
		res.send(result);
	});
});

// Find the scores for all the sublets present in the given city as per the user preferences stored in the DB 
app.get('/getSubletScoreForUserPreferences/:user/:city', function(req,res){
	sublet.getSubletScoreForUserPreferences(req.params.user, req.params.city, function(result){
		res.send(result);
	});
});

// obtain the id for a person based on his linked in url
// provided by LinkedIn
app.get('/userForUrl/:url', function(req,res) {
	var url = "http://www.linkedin.com/in/meethumalu";
	//var url = "http://www.linkedin.com/pub/ektaa-mehta/1a/782/162";
	linkedin.people.url(url, ['id', 'first-name', 'last-name','distance'], function(err, $in) {
  		res.send($in);
	});
});

//obtain distance for linkedin id
//provided by LinkedIn
app.get('/distance/:id', function(req,res) {
	var id = req.params.id;
	linkedin.people.id(id, ['id', 'first-name', 'last-name','distance','positions','publicProfileUrl'], function(err, $in) {
  		res.send($in);
	});
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
		res.redirect('/login');
}

//basic API's 
app.get('/users', sublet.findAllUsers);
app.get('/subletsForCity/:cityName', sublet.findAllSubletsForCity);
// for given user and city, find the analytics related to Travelling DIstance and Social Connections for all the sublets
app.get('/userAnalytics/:userName/:cityName', sublet.findUserAnalytics);
// for a given city, find the night life and utilities analytics for all the sublets present in the city
app.get('/subletAnalytics/:cityName', sublet.findSubletAnalyticsForCity);




var numCPUs = require('os').cpus().length;
var sample  = [ 1,2,3,4,5,6];
var sampleArray = new Array();
var workers = new Array();

//clustering
if (cluster.isMaster) {
	var dummy = new Array();
  	for (var i = 0; i < numCPUs; i++) {
    		// cluster a new server
    		var worker = cluster.fork();
    		workers.push(worker);
   		//on recieving message from the child servers, maintain a count 
    		worker.on('message', function(msg) {
      			dummy.push(msg);
      			check();
    		});
		// once all the child servers have prepared their cache, broadcast a message so that they can start processing the analytics
		// for the sublets belonging to their cache
		function check (){
			if(dummy.length == numCPUs) {
	  			console.log("broadcasting");
				  for (var i in workers) {
			      	  	var worker = workers[i];
   	    				worker.send('Master');
	   			  }
			}
    		} 
  	}

	//API to populate the db
	//helper.populateDb();


  	cluster.on('exit', function(worker, code, signal) {
  		console.log('worker ' + worker.process.pid + ' died');
  	});
} else {

	console.log('performing initial action');
	// prepare the cache of all the sublets and users in the db
	sublet.prepareCache(function(result){
		if(result!=null) {
		 	process.send(cluster.worker.id )
		}
	   }
  	);

	//on receiving broadcast message from master
  	process.on('message', function(msg) {
    		if(msg == "Master"){
			 //process sublet analytics
			 console.log('analytics');
			 sublet.processSubletAnalytics(cluster.worker.id, numCPUs, function(subletResult){
			 	if(subletResult!=null){
	  		 	}
			 });
     		}
  	});

  	http.createServer(app).listen(app.get('port'), function () {
    		console.log("Express server listening on port " + app.get('port'));
  	});
}
