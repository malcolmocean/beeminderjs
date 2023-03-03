#! /usr/bin/env node
var Bee = require('./')
var exec = require('child_process').exec
var prompt = require('prompt')
var fs = require('fs')

var argv = require('minimist')(process.argv.slice(2))

var userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
var rc_path = userhome+"/.bmndrrc"

var exists = fs.existsSync(rc_path)
var rc = exists && fs.readFileSync(rc_path, 'utf8')

function onErr (err) {
  console.error(err)
  return 1
}

function logBmResult (result) {
  console.log("Successfully executed command: \n", result)
}

function printHelp () {
  console.log("usage: bm <command> [<args>]\n")
  console.log("The commands currently available are:")
    console.log("\tuser\t\t\t"+"retrieve properties of the user")
    console.log("\tstatus\t\t\t"+"display all goals sorted by derail time")
    console.log("\tgoal\t\t\t"+"retrieve properties of a goal")
    console.log("\tdatapoints\t\t"+"retrieve all datapoints of a goal")
    console.log("\tcreatedatapoint, cd\t"+"post a new datapoint")
  console.log("")
  console.log("`user` takes no arguments. `goal` and `datapoints` take a single argument")
  console.log("that is the goal's slug (beeminder.com/username/slug) ie:\n")
    console.log("\tbm goal <goalslug>")
    console.log("\tbm datapoints <goalslug>")
  console.log("")
  console.log("The argument format for `createdatapoint` is as follows:\n")
    console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]")
}

function padL (s, n) {
  return ("                                  " + s).slice(-n)
}

function padR (s, n) {
  return (s + "                                     ").slice(0, n)
}

function makeid (n) {
  var longId = ''
  for (var i = 0; i <= n/14; i++) {
    longId += (Math.random() + 1).toString(36).substr(2)
  }
  return longId.substring(0, n)
}

let token
if (argv.access_token) {
  token = {access_token: argv.access_token}
} else if (argv.auth_token) {
  token = {auth_token: argv.auth_token}
} else if (rc && rc.split("auth_token: ")[1]) {
  token = {auth_token: rc.split("auth_token: ")[1].trim()}
}

if (argv.help) {
 printHelp()
} else if (argv.logo || argv._ && argv._[0] === 'logo') {
  Bee.printLogo()
} else if (token) {
  var bm = Bee(token)
  var command = argv._[0]
  if (command == "createdatapoint" || command == "cd") {
    var goalname = argv.goalname || argv.g || argv._[1]
    var value = argv.value || argv._[2]
    var comment = argv.comment || argv._[3]
    var id = argv.id || argv._[4]
    if (!goalname || value === undefined) {
      console.error("Incorrect format. Correct format is:")
      console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]")
      process.exit(1)
    }
    // ensureNumber(value)
    if (value && isNaN(parseFloat(value)) && !comment) {
      comment = value
      value = 1
    }
    var params = {
      value: parseFloat(value)
    }
    if (comment) {params.comment = comment}
    if (id) {params.requestid = id}
    bm.createDatapoint(goalname, params)
    .then(datapoint => console.log(goalname + " ▶  " + datapoint.canonical))
    .catch(onErr)
  } else if (command == "updatedatapoint") {
    var goalname = argv.goalname || argv.g || argv._[1]
    var value = argv.value || argv._[2]
    var comment = argv.comment || argv._[3]
    var id = argv.id || argv._[4]
    if (!id) {
      id = makeid(10)
      console.log("random id generated: " + id)
    }
    if (!goalname || value === undefined) {
      console.error("Incorrect format. Correct format is:")
      console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]")
      process.exit(1)
    }
    // ensureNumber(value)
    if (value && isNaN(parseFloat(value)) && !comment) {
      comment = value
      value = 1
    }
    var params = {
      value: parseFloat(value),
      requestid: id,
    }
    if (comment) {params.comment = comment}
    bm.updateDatapoint(goalname, params).then(datapoint => {
      console.log(goalname + " ▶  " + datapoint.canonical)
    }, onErr)
  } else if (command == "goal") {
    var goalname = argv.goalname || argv.g || argv._[1]
    bm.getGoal(goalname).then(logBmResult, onErr)
  } else if (command == "creategoal") {
    var params = {}
    params.slug = argv.goalname || argv.slug || argv.g || argv._[1]
    params.title = argv.title || params.slug
    params.goal_type = argv.goal_type || 'hustler'
    params.goaldate = argv.goaldate
    params.goalval = argv.goalval
    params.rate = argv.rate
    if (argv.panic) {params.panic = parseInt(argv.panic)}
    if (argv.dryrun) {params.dryrun = true}
    if (argv.secret) {params.secret = true}
    if (argv.datapublic) {params.datapublic = true}
    bm.createGoal(params.slug, params).then(logBmResult, onErr)
  } else if (command == "status") {
    var goalname = argv.goalname || argv.g || argv._[1]
    bm.getStatus().then(user => {
      var lines = []
      lines.push("-----------------------------------------------------------------")
      function pad8 (match) {return padL(match, 8)}
      var next24h = true
      for (var i in user.goals) {
        var goal = user.goals[i]
        if (goal.losedate - Math.ceil(Date.now()/1000) > (18*60*60) && next24h) {
          lines.push("-----------------------------------------------------------------")
          next24h = false
        }
        lines.push("  " + user.username + "/" + padR(goal.slug, 16) + padR(goal.delta_text, 22) + goal.derailtime.replace(/(.*? )/, pad8))
      }
      lines.push("-----------------------------------------------------------------")
      for (var l in lines) {
        console.log(lines[l])
      }
    }, onErr)
  } else if (command == "datapoints") {
    var goalname = argv.goalname || argv.g || argv._[1]
    bm.getDatapoints(goalname).then(logBmResult, onErr)
  } else if (command == "user") {
    bm.getUser().then(logBmResult, onErr)
  } else if (command == "onedatapoint") {
    bm.getUserOneDatapoint(function (err, result) {
      console.log("getUserOneDatapoint keys", Object.keys(result))
    })
  } else if (command == "skinny") {
    bm.getUserSkinny().then(function (result) {
      console.log("getUserSkinny keys", Object.keys(result))
    }).catch(onErr)
  } else if (command == "charge") {
    var amount = argv.amount || argv._[1]
    var note = argv.note || argv._[2]
    var dryrun = argv.dryrun || argv._[3]
    if (!amount || isNaN(parseFloat(amount))) {
      console.error("Incorrect format. Correct format is:")
      console.log("\tbm charge <amount> <note> [<dryrun>]")
      process.exit(1)
    }
    params = {
      amount: parseFloat(amount)
    }
    if (note) {params.note = note}
    if (dryrun) {params.dryrun = true}
    bm.charge(params).then(logBmResult, onErr)
  } else {
    printHelp()
  }
} else {
  console.log("No ~/.bmndrrc detected... starting authentication process...")
  var open
  if (process.platform === 'linux') {
    open = 'xdg-open'
  } else if (process.platform === 'darwin') {
    open = 'open'
  }

  exec(open + ' https://www.beeminder.com/api/v1/auth_token.json', function () {
    console.log("A browser window has opened that will show you your auth_token.\nCopy that and paste it here.")

    prompt.start()
    prompt.get('auth_token', function (err, result) {
      if (err) {return onErr(err)}
      fs.writeFile(rc_path, "[account]\nauth_token: "+result.auth_token+"\n", function (errf) {
        if (errf) {return onErr(errf)}
        console.log("Successfully wrote auth_token to ~/.bmndrrc")
      })
    })
  })
}

// http://blog.npmjs.org/post/119317128765/adding-subcommands-to-your-command-line-tool
