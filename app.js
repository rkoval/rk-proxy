#!/usr/bin/env node

var http = require('http');
var querystring = require('querystring');
var uuid = require('node-uuid');
var httpProxy = require('http-proxy');
var _ = require('lodash');
var mappings = (function() {
  var internalApps = require('./internal-apps');
  return internalApps(require('./mappings'));
}());

(function() {

  var proxy = httpProxy.createProxyServer({});

  var mapToRedirect = function mapToRedirect(host) {
    var redirect = _.find(mappings, function(mapping) {
      return _.contains(host, mapping.contains);
    });

    // if none found in mapping, fall back to main site
    if (!redirect) {
      redirect = {
        redirect: 'http://localhost:3000'
      };
    }
    return redirect;
  };

  var performRedirect = function performRedirect(redirect, req, res) {
    if (_.contains(redirect.redirect, 'localhost')) {
      // route internally
      proxy.web(req, res, { target: redirect.redirect });
    } else {
      // redirect externally
      trackAnalytics(redirect);
      res.writeHead(307, {'Location': redirect.redirect });
      res.end();
    }
  };

  var trackAnalytics = function trackAnalytics(redirect) {
    return new Promise(function(resolve, reject) {
      var requestPayload = querystring.stringify({
        cid: uuid.v4(),
        v: '1',
        tid: 'UA-64912146-1', // ID of my analytics
        t: 'pageview',
        dp: redirect.contains || '/',
        dt: 'ryankoval.com'
      });

      var options = {
        host: 'www.google-analytics.com',
        port: 80,
        path: '/collect',
        method: 'POST'
      };

      var request = http.request(options, function(res) {
        resolve(res);
      });
      request.write(requestPayload);
      request.end();
    });
  };

  var router = function(req, res) {
    var host = req.headers.host;
    var redirect = mapToRedirect(host);
    performRedirect(redirect, req, res);
  };

  var port = process.env.PORT || 18080;
  var server = http.createServer(router).listen(port, function() {
    console.log('Listening on port ' + server.address().port);
  });
})();
