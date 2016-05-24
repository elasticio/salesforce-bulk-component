/* eslint new-cap: [2, {"capIsNewExceptions": ["Q"]}] */
var Q = require('q');
var elasticio = require('elasticio-node');
var messages = elasticio.messages;
var jsforce = require('jsforce');

module.exports.process = processAction;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  var self = this;
  var query = cfg.query;

  var conn = new jsforce.Connection({
    oauth2 : {
      clientId : process.env.SALESFORCE_KEY,
      clientSecret : process.env.SALESFORCE_SECRET,
      redirectUri : 'https://app.elastic.io/oauth/v2'
    },
    instanceUrl : cfg.oauth.instance_url,
    accessToken : cfg.oauth.access_token,
    refreshToken : cfg.oauth.refresh_token
  });
  conn.on("refresh", function(accessToken, res) {
    console.log('Keys were updated, res=%j', res);
    self.emit('updateKeys', { oauth : res });
  });

  function doQuery() {
    console.log('About to query=%s', query);

    var results = conn.bulk.query(query);

    results.on('record', function processRecord(record) {
      var body = record;
      var data = messages.newMessageWithBody(body);
      self.emit('data', data);
    });

    results.on('error', function(err) {
      self.emit('error', err);
    });
  }

  function emitError(e) {
    console.log('Oops! Error occurred');

    self.emit('error', e);
  }

  function emitEnd() {
    console.log('Finished execution');

    self.emit('end');
  }

  Q().then(doQuery).fail(emitError).done(emitEnd);
}
