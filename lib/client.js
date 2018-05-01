'use strict';

var url = require('url');
var request = require('request');

var assign = require('lodash.assign');

var signRequest = require('./request_signer').signRequest;

var Client = function(clientOpts) {
  var self = this;

  self.uri = clientOpts.uri || 'https://api.outkit.io/v1';
  self.key = clientOpts.key;
  self.secret = clientOpts.secret;
  self.passphrase = clientOpts.passphrase;
};

Client.prototype.getMessage = function(messageId, opts, callback) {
  var self = this;
  opts = opts || {};
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  var reqOpts = {
    json: true,
    resolveWithFullResponse: opts.returnResponse,
    method: 'GET',
    uri: self.uri + '/messages/' + messageId,
  };
  return self._performRequest(reqOpts, callback);
};

Client.prototype.createMessage = function(message, opts, callback) {
  var self = this;
  opts = opts || {};
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  var reqOpts = {
    json: true,
    resolveWithFullResponse: opts.returnResponse,
    method: 'POST',
    uri: self.uri + '/messages',
    body: {
      message: message,
    },
  };
  return self._performRequest(reqOpts, callback);
};

Client.prototype._performRequest = function(reqOpts, callback) {
  var self = this;

  var doReq = function(cb) {
    request(reqOpts, (respErr, response) => {
      var body = response && response.body ? response.body : null;
      var data = body && body.data ? body.data : (body.error ? body : null);
      var dataErr = body.error ? body.error : null;
      var error = respErr || dataErr;
      var retVal = reqOpts.resolveWithFullResponse ? response : data;
      cb(error, retVal);
    });
  };

  var sig = self._getSignature(reqOpts);
  reqOpts.headers = self._addHeaders(reqOpts.headers || {}, sig);
  if (typeof callback === 'function') {
      doReq(callback);
  } else {
    return new Promise(function(resolve, reject) {
      doReq(function(error, retVal) {
        if (error) {
          reject(error);
        } else {
          resolve(retVal);
        }
      });
    });
  }
};

Client.prototype._getSignature = function(reqOpts) {
  var self = this;
  var auth = {
    key: this.key,
    secret: this.secret,
    passphrase: this.passphrase
  };
  var sig = signRequest(auth, reqOpts.method, self._makeRelativeURI(reqOpts.uri), reqOpts.body, reqOpts.qs);
  return {
    'Outkit-Access-Key': sig.key,
    'Outkit-Access-Signature': sig.signature,
    'Outkit-Access-Timestamp': sig.timestamp,
    'Outkit-Access-Passphrase': sig.passphrase,
  };
};

Client.prototype._makeRelativeURI = function(uri) {
  var parsed = url.parse(uri);
  return parsed.pathname + (parsed.search || '');
};

Client.prototype._addHeaders = function(obj, additional) {
  obj.headers = obj.headers || {};
  return assign(obj.headers, {
    'User-Agent': 'outkit-javascript-client',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }, additional);
};

module.exports = exports = Client;
