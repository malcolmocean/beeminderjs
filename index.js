const fetch = require('node-fetch')
var querystring = require('querystring')
const version = require('./package.json').version
let useragent = `BeeminderJS/${version}`
let ignoreDupes = false

module.exports = function (token) {
  if (typeof token == "string") {
    token = {auth_token: token}
  }
  var host = 'https://www.beeminder.com/api/v1'
  var self = this
  var tokenString = querystring.stringify(token) + "&"

  this.getUserWithParams = function (params) {
    return self.callApi('/users/me.json', params || null, 'GET')
  }

  this.getUser = function () {
    return self.getUserWithParams()
  }

  this.getUserOneDatapoint = function () {
    return self.getUserWithParams({
      associations: true,
      datapoints_count: 1,
    })
  }

  this.getUserSkinny = function () {
    return self.getUserWithParams({
      diff_since: 0,
      skinny: true,
    })
  }

  this.getStatus = async function () {
    const user = await self.getUserSkinny()
    const goals = user.goals
    goals.sort((a, b) => a.losedate - b.losedate)
    const simplegoals = []
    for (let i in goals) {
      const goal = goals[i]
      let derailsecs = goal.losedate - Math.ceil(Date.now()/1000)
      const deraildays = Math.floor(derailsecs/(60*60*24))
      derailsecs %= (60*60*24)
      const derailhours = Math.floor(derailsecs/(60*60))
      derailsecs %= (60*60)
      const derailmins = Math.floor(derailsecs/60)
      derailsecs %= 60
      const derailtime = goal.limsum.replace(" 0 days", " " +
          (derailhours ?  derailhours + " hours" :
            (derailmins ? derailmins + " mins" :
              derailsecs + " secs")))
      simplegoals.push({
        title: goal.title,
        slug: goal.slug,
        delta_text: goal.delta_text,
        next_delta: (goal.limsum || '').split(' ')[0],
        losedate: goal.losedate,
        autodata: goal.autodata,
        derailtime: derailtime,
        lastvalue: goal.last_datapoint && goal.last_datapoint.value,
      })
    }
    return {username: user.username, goals: simplegoals}
  }

  this.getGoal = function (slug) {
    const path = '/users/me/goals/'+slug+'.json'
    return self.callApi(path, null, 'GET')
  }

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
  this.createGoal = async function (slug, params) {
    const path = '/users/me/goals.json'
    let n = 0
    if (params.goaldate) {n++}
    if (params.goalval) {n++}
    if (params.rate) {n++}
    if (n !== 2) {
      throw {err: 'Invalid input. Required: 2 of [goaldate, goalval, rate]. Provided: ' + n}
    }
    if (!params.slug) {
      params.slug = slug
    }
    return self.callApi(path, params, 'POST')
  }

  this.getDatapoints = function (slug) {
    const path = '/users/me/goals/'+slug+'/datapoints.json'
    return self.callApi(path, null, 'GET')
  }

  /** params = {
    *     value: {type: Number, required: true},
    *     timestamp: {type: Number, default: now},
    *     comment: {type: String, default: ''},
    *     sendmail: {type: Boolean, default: false},
    *     requestid: {type: String.alphanumeric},
    *   }
    */
  this.createDatapoint = function (slug, params) {
    const path = '/users/me/goals/'+slug+'/datapoints.json'
    return self.callApi(path, params, 'POST')
  }

  /** datapoints: Array of Objects containing the same keys as for `createDatapoint`
    */
  this.createDatapoints = function (slug, datapoints) {
    const path = '/users/me/goals/'+slug+'/datapoints/create_all.json'
    return self.callApi(path, {datapoints: JSON.stringify(datapoints)}, 'POST')
  }

  /** params = {
    *     value: {type: Number, required: true},
    *     timestamp: {type: Number, default: now},
    *     comment: {type: String, default: ''},
    *     sendmail: {type: Boolean, default: false},
    *     requestid: {type: String.alphanumeric, required: true}, // required for update & upsert
    *   }
    */
  this.updateDatapoint = function (slug, params) {
    const path = '/users/me/goals/'+slug+'/datapoints/'+params.requestid+'.json'
    return self.callApi(path, params, 'PUT')
  }

  /** params = {
    *     amount: Number, // in USD
    *     [note]: String, // An explanation of why the charge was made.
    *     [dryrun]: Boolean, // (if true, JSON returned as normal but no actual charge)
    *   }
    */
  this.charge = function (params) {
    const path = '/charges.json'
    return self.callApi(path, params, 'POST')
  }

  this.callApi = async function (path, obj, method) {
    const query = obj ? querystring.stringify(obj) : ''
    // const url = host + '/nope' + path + "?" + tokenString + query
    const url = host + path + "?" + tokenString + query
    const details = method == 'GET' ? {headers: {'User-Agent': useragent}} : {
      method: method,
      body: obj ? JSON.stringify(obj) : undefined,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': useragent,
      },
    }
    let error
    const result = await fetch(url, details).catch(err => {
      details.url = url
      error = {
        name: 'Network error. Either beeminder.js is offline or the Beeminder API is down.',
        status: 0,
        request: details,
      }
      throw error
    })
    details.url = url
    const resultText = await result.text()
    let resultJson
    try {
      resultJson = JSON.parse(resultText)
    } catch (err) {
      error = {
        name: 'Non-JSON response received. Beeminder is probably down.',
        status: 503,
        message: resultText,
        request: details,
      }
      throw error
    }
    if (result.status == 422 && ignoreDupes) { // duplicate request
      result.status = 200
    } else if (result.status > 300) {
      error = {
        name: 'Some unknown error; treat as Beeminder probably down.',
        status: result.status,
        message: resultJson,
      }
    } else if (result.error) {
      error = result.error
    }
    if (!error) {
      return resultJson
    } else {
      error.request = details
      throw error
    }
  }
  return this
}
module.exports.printLogo = require('./asciilogo')
module.exports.appendToUserAgent = function (ua) {
  useragent += ' ' + ua
}
module.exports.setIgnoreDupes = function (now=true) {
  ignoreDupes = now
}


/* new offline error

FetchError: request to https://www.beeminder.com/api/v1/users/me/goals/pushups/datapoints.json?auth_token=TOKEN&value=10 failed, reason: getaddrinfo EAI_AGAIN www.beeminder.com
    at ClientRequest.<anonymous> (/home/malcolm/dev/beeminderjs/node_modules/node-fetch/lib/index.js:1491:11)
    at ClientRequest.emit (node:events:390:28)
    at TLSSocket.socketErrorListener (node:_http_client:447:9)
    at TLSSocket.emit (node:events:390:28)
    at emitErrorNT (node:internal/streams/destroy:157:8)
    at emitErrorCloseNT (node:internal/streams/destroy:122:3)
    at processTicksAndRejections (node:internal/process/task_queues:83:21) {
  type: 'system',
  errno: 'EAI_AGAIN',
  code: 'EAI_AGAIN'
}


*/
