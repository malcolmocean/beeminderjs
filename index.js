var curl = require('curlrequest');
var querystring = require('querystring');
const version = require('./package.json').version
let useragent = `BeeminderJS/${version}`

module.exports = function (token) {
  function wrapCb(req, callback) {
    return function (curlErrorString, curlResponseString) {
      var err, response;
      try { // "Couldn't resolve host. The given remote host was not resolved." means offline
        if (curlErrorString) {
          err = JSON.parse(curlErrorString);
        } else if (curlResponseString) {
          response = JSON.parse(curlResponseString);
          if (response.errors || response.error) {
            err = response.errors || response.error;
            response = null;
          }
        }
      } catch (exception) {
        err = exception;
        if (curlErrorString) {
          if (/resolve/.test(curlErrorString) && /host/.test(curlErrorString)) {
            err = {
              name: 'Either Beeminder is down or this script doesn\'t have internet access.',
              status: 503,
              message: curlErrorString,
            }
          } else {
            err = {
              name: 'Some unknown error; treat as Beeminder probably down.',
              status: 503,
              message: curlErrorString,
            }
          }
        } else if (exception.name == 'SyntaxError') {
          err = {
            name: 'Non-JSON response received. Beeminder is probably down.',
            status: 503,
            message: curlResponseString,
          }
        }
      }
      if (err === 'resource not found') {   
        err = {
          name: 'Resource not found.',
          status: 404,
        }
      }
      if (err) {
        err.request = req
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
    return self.callApi(path, null, 'GET', callback);
  };

  this.getUserSkinny = function (callback) {
    var path = '/users/me.json';
    var params = {
      diff_since: 0,
      skinny: true,
    };
    return self.callApi(path, params, 'GET', callback);
  };

  this.getStatus = function (callback) {
    return self.getUserSkinny(function (err, user) {
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
            lastvalue: goal.last_datapoint && goal.last_datapoint.value,
          });
        }
        callback(null, {username: user.username, goals: simplegoals});
      }
    });
  };

  this.getGoal = function (slug, callback) {
    var path = '/users/me/goals/'+slug+'.json';
    return self.callApi(path, null, 'GET', callback);
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
    return self.callApi(path, params, 'POST', callback);
  };

  this.getDatapoints = function (slug, callback) {
    var path = '/users/me/goals/'+slug+'/datapoints.json';
    return self.callApi(path, null, 'GET', callback);
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
    return self.callApi(path, params, 'POST', callback);
  };

  /** datapoints: Array of Objects containing the same keys as for `createDatapoint`
    */
  this.createDatapoints = function (slug, datapoints, callback) {
    var path = '/users/me/goals/'+slug+'/datapoints/create_all.json';
    return self.callApi(path, {datapoints: JSON.stringify(datapoints)}, 'POST', callback);
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
    return self.callApi(path, params, 'PUT', callback);
  };

  /** params = {
    *     amount: Number, // in USD
    *     [note]: String, // An explanation of why the charge was made.
    *     [dryrun]: Boolean, // (if true, JSON returned as normal but no actual charge)
    *   }
    */
  this.charge = function (params, callback) {
    var path = '/charges.json';
    return self.callApi(path, params, 'POST', callback);
  };

  this.callApi = function (path, obj, method, callback) {
    return new Promise ((resolve, reject) => {
      data = obj ? querystring.stringify(obj) : '';
      var req = {
        url: host + path + "?" + tokenString + data,
        method: method,
        useragent: useragent,
      };
      curl.request(req, wrapCb(req, (err, result) => {
        if (typeof callback == 'function') {
          callback(err, result)
        }
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      }));
    })
  };
  return this;
};
module.exports.printLogo = require('./asciilogo');
module.exports.appendToUserAgent = function (ua) {
  useragent += ' ' + ua
}
