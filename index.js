var curl = require('curlrequest');
var querystring = require('querystring');

module.exports = function (token) {
  if (typeof token == "string") {
    token = {auth_token: token}
  }
  var host = 'https://www.beeminder.com/api/v1'
  var self = this;
  var tokenString = querystring.stringify(token) + "&";

  this.getUser = function (callback) {
    var path = "/users/me.json"
    self.callApi(path, null, 'GET', callback)
  }

  this.getGoal = function (goalname, callback) {
    var path = '/users/me/goals/'+goalname+'.json'
    self.callApi(path, null, 'GET', callback)
  }

  this.getDatapoints = function (goalname, callback) {
    var path = '/users/me/goals/'+goalname+'/datapoints.json'
    self.callApi(path, null, 'GET', callback)
  }

  /** params = {
    *     value: {type: Number, required: true},
    *     timestamp: {type: Number, default: now},
    *     comment: {type: String, default: ''},
    *     sendmail: {type: Boolean, default: false},
    *     requestid: {type: String.alphanumeric},
    *   }
    */
  this.createDatapoint = function (goalname, params, callback) {
    var path = '/users/me/goals/'+goalname+'/datapoints.json'
    // not using object literal notation because it causes
    // querystring to insert 'param=' if param is undefined
    self.callApi(path, params, 'POST', callback)
  }

  this.callApi = function (path, obj, method, callback) {
    data = obj ? querystring.stringify(obj) : '';
    var req = {
      url: host + path + "?" + tokenString + data,
      method: method,
    };
    curl.request(req, callback);
  }
  return this;
}
