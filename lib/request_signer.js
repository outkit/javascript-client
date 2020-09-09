'use strict';
const crypto = require('crypto');
const querystring = require('querystring');
/**
 Signs request messages for authenticated requests to Outkit
 * @param auth {object} hash containing key, secret and passphrase
 * @param method {string} The REST method to use
 * @param path {string} The request path, e.g. /api/emails
 * @param body {object} A hash of body properties
 * @param qs {object} A hash of query string parameters
 * @returns {{key: string, signature: *, timestamp: number, passphrase: string}}
 */
module.exports.signRequest = function(auth, method, path, rawMessage, qs, contentType) {
  const timestamp = Date.now() / 1000;
  let body = '';
  if (rawMessage) {
    body = rawMessage;
  } else if (qs && Object.keys(qs).length !== 0) {
    body = '?' + querystring.stringify(qs);
  }
  const what = timestamp +  method.toUpperCase() + path + body;
  // const key = Buffer(auth.secret, 'base64');
  const key = auth.secret;
  const hmac = crypto.createHmac('sha256', key);
  const signature = hmac.update(what).digest('base64');
  return {
    key: auth.key,
    signature: signature,
    timestamp: timestamp,
    passphrase: auth.passphrase
  };
};