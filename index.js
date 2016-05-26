var curl = require('curlrequest');
var querystring = require('querystring');

module.exports = function (token) {
  function wrapCb(callback) {
    return function (curlErrorString, curlResponseString) {
      var err, response;
      try { // "Couldn't resolve host. The given remote host was not resolved." means offline
        if (curlErrorString) {
          err = JSON.parse(curlErrorString);
        } else if (curlResponseString) {
          response = JSON.parse(curlResponseString);
          if (response.errors) {
            err = response.errors;
            response = null;
          }
        }
      } catch (exception) {
        err = exception;
        response = curlErrorString || curlResponseString;
        if (exception == 'SyntaxError - Unexpected token <') {
          err = {
            name: 'HTML response received, not JSON',
            message: response,
          }
        }
      }
      callback(err, response);
    };
  }
  if (typeof token == "string") {
    token = {auth_token: token};
  }
  var host = 'https://www.beeminder.com/api/v1';
  var self = this;
  var tokenString = querystring.stringify(token) + "&";


  this.getUser = function (callback) {
    var path = '/users/me.json';
    self.callApi(path, null, 'GET', callback);
  };

  this.getUserSkinny = function (callback) {
    var path = '/users/me.json';
    var params = {
      diff_since: 0,
      skinny: true,
    };
    self.callApi(path, params, 'GET', callback);
  };

  this.getStatus = function (callback) {
    self.getUserSkinny(function (err, user) {
      if (err) {
        callback(err);
      } else {
        var goals = user.goals;
        goals.sort(function (a, b) {
          return a.losedate - b.losedate;
        });
        var simplegoals = [];
        for (var i in goals) {
          var goal = goals[i];
          var derailsecs = goal.losedate - Math.ceil(Date.now()/1000);
          var deraildays = Math.floor(derailsecs/(60*60*24));
          derailsecs %= (60*60*24);
          var derailhours = Math.floor(derailsecs/(60*60));
          derailsecs %= (60*60);
          var derailmins = Math.floor(derailsecs/60);
          derailsecs %= 60;
          var derailtime = goal.limsum.replace(" 0 days", " " +
              (derailhours ?  derailhours + " hours" :
                (derailmins ? derailmins + " mins" :
                  derailsecs + " secs")));
          simplegoals.push({
            title: goal.title,
            slug: goal.slug,
            delta_text: goal.delta_text,
            next_delta: (goal.limsum || '').split(' ')[0],
            losedate: goal.losedate,
            autodata: goal.autodata,
            derailtime: derailtime,
          });
        }
        callback(null, {username: user.username, goals: simplegoals});
      }
    });
  };

  this.getGoal = function (slug, callback) {
    var path = '/users/me/goals/'+slug+'.json';
    self.callApi(path, null, 'GET', callback);
  };

  /**   slug is kept as a top level param to be more consistent with
    * the other methods
    *   params = {
    *     title (string)
    *     goal_type (string)
    *     goaldate (number or null)
    *     goalval (number or null)
    *     rate (number or null)
    *     initval (number): Initial value for today’s date. Default: 0.
    *     [panic] (number)
    *     [secret] (boolean)
    *     [datapublic] (boolean)
    *     dryrun (boolean). Pass this to test the endpoint without actually creating a goal. Defaults to false.
    *     Exactly two out of three of goaldate, goalval, and rate are required.
    *   }
    */
  this.createGoal = function (slug, params, callback) {
    var path = '/users/me/goals.json'
    var n = 0;
    if (params.goaldate) {n++;}
    if (params.goalval) {n++;}
    if (params.rate) {n++;}
    if (n !== 2) {
      return callback({err: 'Invalid input. Required: 2 of [goaldate, goalval, rate]. Provided: ' + n})
    }
    if (!params.slug) {
      params.slug = slug;
    }
    self.callApi(path, params, 'POST', callback);
  };

  this.getDatapoints = function (slug, callback) {
    var path = '/users/me/goals/'+slug+'/datapoints.json';
    self.callApi(path, null, 'GET', callback);
  };

  /** params = {
    *     value: {type: Number, required: true},
    *     timestamp: {type: Number, default: now},
    *     comment: {type: String, default: ''},
    *     sendmail: {type: Boolean, default: false},
    *     requestid: {type: String.alphanumeric},
    *   }
    */
  this.createDatapoint = function (slug, params, callback) {
    var path = '/users/me/goals/'+slug+'/datapoints.json';
    self.callApi(path, params, 'POST', callback);
  };

  /** params = {
    *     value: {type: Number, required: true},
    *     timestamp: {type: Number, default: now},
    *     comment: {type: String, default: ''},
    *     sendmail: {type: Boolean, default: false},
    *     requestid: {type: String.alphanumeric, required: true}, // required for update & upsert
    *   }
    */
  this.updateDatapoint = function (slug, params, callback) {
    var path = '/users/me/goals/'+slug+'/datapoints/'+params.requestid+'.json';
    self.callApi(path, params, 'PUT', callback);
  };

  /** params = {
    *     amount: Number, // in USD
    *     [note]: String, // An explanation of why the charge was made.
    *     [dryrun]: Boolean, // (if true, JSON returned as normal but no actual charge)
    *   }
    */
  this.charge = function (params, callback) {
    var path = '/charges.json';
    self.callApi(path, params, 'POST', callback);
  };

  this.callApi = function (path, obj, method, callback) {
    data = obj ? querystring.stringify(obj) : '';
    var req = {
      url: host + path + "?" + tokenString + data,
      method: method,
    };
    curl.request(req, wrapCb(callback));
  };
  return this;
};
module.exports.printLogo = require('./asciilogo');
