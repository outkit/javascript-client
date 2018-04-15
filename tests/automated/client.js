var assert = require('assert');
var nock = require('nock');
// var nock = function() { 
//   return {
//     get: function() { return nock(); },
//     post: function() { return nock(); },
//     reply: function() { return nock(); },
//   }
// };

var Outkit = require('../../lib/index.js');

var key = 'sQngiw9hp5Ag4rL89oqkBBb3Czz4gqb5KW899y3IkblSB-a_';
var secret = 'Y29SOVz4L_bD8O8_Ja5-GX-lChrcM0JmxXePD2bflz0fG4_Z-ADfD8UmF2XzEEW8';
var passphrase = 'uff0tdcxmhlhts1213dq0n4vmcjl9t';

// var SERVICE_API_URL = 'https://api.outkit.io/api';
var SERVICE_API_HOST_PORT = 'http://localhost:4990';
var SERVICE_API_URL = SERVICE_API_HOST_PORT + '/v1';

var client = new Outkit.Client({key, secret, passphrase, uri: SERVICE_API_URL});

suite('Client');

test('._getSignature', function() {
  var reqOpts = {
    method: 'POST',
    uri: SERVICE_API_URL + '/messages',
  }
  var relativeURI = '/messages';
  var opts = {
    body: {
      message: {
        template: 'my-template',
      }
    }
  }

  var sig = client._getSignature(reqOpts);

  assert.equal(sig['Outkit-Access-Key'], key);
  assert.equal(sig['Outkit-Access-Passphrase'], passphrase);

  assert(sig['Outkit-Access-Timestamp'])
  assert(sig['Outkit-Access-Signature'])
});

test('get message', function(done) {
  var expectedResponse = {
    "id": "test-id",
    "template": "my-template",
    "project": "my-project",
    "status": "received",
    "from": "support@outkit.io"
  }

  nock(SERVICE_API_HOST_PORT)
    .get('/v1/messages/test-id')
    .reply(200, expectedResponse);

  client.getMessage('test-id', function(err, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  })
});

test('submit message', function(done) {
  var message = {
    template : 'my-template',
    project : 'my-project',
    to : 'foo@example.com'
  };

  expectedMessage = message;
  expectedMessage.foo = 'bar';

  var expectedResponse = {
    data: {
      id: '1428b97c-bec2-429e-a94c-51192926778d',
    },
  };

  nock(SERVICE_API_HOST_PORT)
    .post('/v1/messages', {message: expectedMessage})
    .reply(200, expectedResponse);


  client.createMessage(message, function(err, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

