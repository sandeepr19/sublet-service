var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;

var sample  = [ 1,2,3,4,5,6];


if (cluster.isMaster) {
  console.log("master");
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    console.log("forking");
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  // Workers can share any TCP connection
  // In this case its a HTTP server
  console.log('worker ' + cluster.worker.id + ' hello');
  console.log('array ' + sample[cluster.worker.id - 1]);
  for ( var i =1; i < 3; i++ ) {
	console.log("testing");
	

  }
  http.createServer(function(req, res) {
    	res.writeHead(200);
    	//res.end("hello world\n");
    	res.end('Hello from Worker ' + cluster.worker.id);
  	}).listen(8000);
  }

