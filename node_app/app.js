(function() {
  var FAPI_FILES_ROOT, app, express, fapi, port;

  express = require('express');

  fapi = new require(process.env.FAPI_ROOT || './fapi');

  app = express.createServer(express.logger());

  app.use(express.bodyParser());

  app.use(express.static("" + __dirname + "/../public"));

  FAPI_FILES_ROOT = 'fake_plugins';

  app.get(/^\/fapi\/(.*)/, function(req, res) {
    return new fapi.Fapi(FAPI_FILES_ROOT).get(req, res, req.params[0]);
  });

  app.post(/^\/fapi\/(.*)/, function(req, res) {
    return new fapi.Fapi(FAPI_FILES_ROOT).post(req, res, req.params[0]);
  });

  app.get('/fapi', function(req, res) {
    return res.redirect('/fapi/');
  });

  app.get('/', function(req, res) {
    return res.redirect('/index.html');
  });

  port = process.env.PORT || 3000;

  app.listen(port, function() {
    return console.log("Listening on " + port);
  });

}).call(this);
