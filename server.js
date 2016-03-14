var express = require('express');
var compression = require('compression');
var app = express();
app.use(compression());
app.use(express.static(__dirname + '/public'));

function wwwRedirect(req, res, next) {
    if (req.headers.host.slice(0, 4) === 'www.') {
        var newHost = req.headers.host.slice(4);
        return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
    }
    next();
};

app.set('trust proxy', true);
app.use(wwwRedirect);

app.listen(80);
console.log("Running on port 80...");
