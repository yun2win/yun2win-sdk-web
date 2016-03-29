var http = require("http"),
	url = require("url"),
	fs = require("fs");
http.createServer(function(req,res){
	var pathname = url.parse(req.url).pathname;
	console.log(pathname);
 	fs.readFile("."+pathname, function readData(err, data) {
        res.writeHead(200);
        res.end(data);
    });
}).listen(8006);
