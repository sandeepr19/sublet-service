exports.googleApiKey = "";
exports.googleOutputFormat = "json";

exports.yelpConsumerKey = "";
exports.yelpConsumerSecret = "";
exports.yelpToken = "";
exports.yelpTokenSecret = ""; 


var yelp = require("yelp").createClient({
  consumer_key: "", 
  consumer_secret: "",
  token: "",
  token_secret: ""
});

