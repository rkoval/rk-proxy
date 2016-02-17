#!/usr/bin/env node

const http = require('http');
const httpProxy = require('http-proxy');
const _ = require('lodash');
const ua = require('universal-analytics');
const proxy = httpProxy.createProxyServer({});
const config = require('config');
const mappings = config.get('mappings');

module.exports = (function() {

  const cookieParser = require('cookie-parser')();

  const generateGaCookie = function generateGaCookie(req, res, next) {
    const pattern = /1\.\d\.\d{10}\.\d*/i;
    if (!req.cookies._ga || !req.cookies._ga.match(pattern)) {
      // http://stackoverflow.com/questions/16102436/what-are-the-values-in-ga-cookie
      const version = '1';
      const host = req.headers.host;
      const subdomains = host.split('.');
      const domain = (function createDomain() {
        var result = host;
        if (result.indexOf(':') > -1) {
          result = result.substr(0, result.indexOf(':'));
        }

        result = result.split('.');
        if (result.length > 2) {
          result = result.slice(1);
        }

        return result.join('.');
      }());
      const random = _.random(Math.pow(10, 9), Math.pow(10, 10) - 1);
      const date = Math.round(new Date().getTime() / 1000);
      req.cookies._ga = 'GA' + version + '.' + subdomains.length + '.' + random + '.' + date;
      res.setHeader('Set-Cookie', ['_ga=' + req.cookies._ga + '; domain=' + domain]);
    }
    next()
  };

  const analyticsMiddleware = ua.middleware('UA-64912146-1');

  const getRedirectMapping = function getRedirectMapping(req, res, next) {
    const host = req.headers.host;
    var redirect = _.find(mappings, function(value, key) {
      return _.contains(host, key);
    });

    // if none found in mapping, fall back to main site
    if (!redirect) {
      redirect = mappings['*'];
    }
    next(redirect);
  };

  const sendAnalytics = function sendAnalytics(req, res, next, redirect) {
    new Promise(function(resolve, reject) {
      if (redirect.contains) {
        req.visitor.pageview(redirect.contains, function() {
          resolve();
        }).send();
      }
    });
    next(redirect)
  };

  const performRedirect = function performRedirect(req, res, next, redirect) {
    if (_.contains(redirect, config.get('host'))) {
      // route internally
      proxy.web(req, res, { target: redirect });
    } else {
      // redirect externally
      res.writeHead(307, { 'Location': redirect });
      res.end();
    }
    next();
  };

  const done = function() { return true; };

  const router = function(req, res) {
    const functions = [
      cookieParser,
      generateGaCookie,
      analyticsMiddleware,
      getRedirectMapping,
      sendAnalytics,
      performRedirect,
      done
    ];

    const chain = _.reduceRight(functions, function(flattened, other) {
      return _.partial(other, req, res, flattened)
    });

    chain();
  };

  const port = process.env.PORT || 18080;
  const server = http.createServer(router).listen(port, function () {
    console.log('Listening on port ' + server.address().port);
  });

  return {
    getRedirectMapping
  };
})();
