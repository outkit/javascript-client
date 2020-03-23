'use strict';

var fs = require('fs');
var url = require('url');
var axios = require('axios');
var assign = require('lodash.assign');
var FormData = require('form-data');

var signRequest = require('./request_signer').signRequest;

function formatResponse(response, resolveWithFullResponse, reqError) {
  var retVal, dataErr, error;
  if (response) {
    var body = response && response.data ? response.data : null;
    var data = body && body.data ? body.data : (body.error ? body : null);
    dataErr = body.error ? body.error : null;
    retVal = data;
    if (resolveWithFullResponse) {
      delete response.request;
      delete response.config;
      retVal = response
    } 
  }
  error = reqError || dataErr;
  return {retVal: retVal, error: error};
}

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
    resolveWithFullResponse: opts.returnResponse,
    method: 'GET',
    url: self.uri + '/messages/' + messageId,
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
    resolveWithFullResponse: opts.returnResponse,
    method: 'POST',
    url: self.uri + '/messages',
    data: {
      message: message,
    },
  };
  if (message.attachments) {
    var attachments = message.attachments;
    delete message.attachments;
    var formData = new FormData();
    if (message.disposition) {
      formData.append('disposition', message.disposition);
      delete message.disposition;
    }
    formData.append('message', JSON.stringify(message));
    for (var i = 0; i < attachments.length; i++ ) {
      let file = attachments[i];
      // formData.append('attachments[' + i + ']', fs.createReadStream(file));
      formData.append('attachments[]', fs.readFileSync(file));
    }
    reqOpts.data = formData.getBuffer()
    reqOpts.headers = formData.getHeaders();
    console.log('formData.getHeaders()', formData.getHeaders());
    // reqOpts.headers['Content-Type'] = 'multipart/form-data; boundary=' + formData._boundary;
  }
  return self._performRequest(reqOpts, callback);
};

Client.prototype._performRequest = function(reqOpts, callback) {
  var self = this;

  var doReq = function(cb) {
    var resolveWithFullResponse = reqOpts.resolveWithFullResponse;
    delete reqOpts.resolveWithFullResponse;
    axios(reqOpts)
      .then(function(response) {
        console.log('SUCCESS!!');
        var formattedResponse = formatResponse(response, resolveWithFullResponse);
        cb(null, formattedResponse.retVal);
      })
      .catch(function(err) {
        console.log('FAILURE!!');
        if (err.response) {
          console.log('error response data', err.response.data);
        }
        var formattedResponse = formatResponse(err.response, resolveWithFullResponse, err);
        cb(formattedResponse.error, formattedResponse.retVal);
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
  var sig = signRequest(auth, reqOpts.method, self._makeRelativeURI(reqOpts.url), reqOpts.data, reqOpts.qs, reqOpts.headers['content-type']);
  return {
    'outkit-access-key': sig.key,
    'outkit-access-signature': sig.signature,
    'outkit-access-timestamp': sig.timestamp,
    'outkit-access-passphrase': sig.passphrase,
  };
};

Client.prototype._makeRelativeURI = function(uri) {
  var parsed = url.parse(uri);
  return parsed.pathname + (parsed.search || '');
};

Client.prototype._addHeaders = function(existing, additional) {
  existing = existing || {};
  var commonHeaders = {
    'user-agent': 'outkit-javascript-client',
    'accept': 'application/json',
  }
  if (!existing['content-type']) {
    commonHeaders['content-type'] = 'application/json';
  }
  return assign(existing, commonHeaders, additional);
};

module.exports = exports = Client;
