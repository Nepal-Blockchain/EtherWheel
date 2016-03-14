var express = require('express');
var compression = require('compression');
var app = express();
app.use(compression());
app.use(express.static(__dirname + '/public'));
app.listen(80);
console.log("Running on port 80...");
