#! /usr/bin/env node
var Bee = require('./');
var sys = require('sys');
var exec = require('child_process').exec;
var prompt = require('prompt');
var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2));

var userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var rc_path = userhome+"/.bmndrrc";

fs = require('fs');
var exists = fs.existsSync(rc_path);
var rc = exists && fs.readFileSync(rc_path, 'utf8');

function onErr (err) {
  console.error(err);
  return 1;
}

function handleErr(after) {
  return function (err, result) {
    if (err) {return onErr(err);}
    if (!result) {return onErr("no result");}
    if (result.errors) {
      for (var e in result.errors) {
        console.error(e);
      }
      return 1;
    }
    after(result);
  };
}

function bmCallback (err, result) {
  if (err) {return onErr(err);}
  console.log("Successfully executed command: \n", result);
}

function printHelp () {
  console.log("usage: bm <command> [<args>]\n");
  console.log("The commands currently available are:")
    console.log("\tuser\t\t\t"+"retrieve properties of the user");
    console.log("\tgoal\t\t\t"+"retrieve properties of a goal");
    console.log("\tdatapoints\t\t"+"retrieve all datapoints of a goal");
    console.log("\tcreatedatapoint, cd\t"+"post a new datapoint");
  console.log("");
  console.log("`user` takes no arguments. `goal` and `datapoints` take a single argument");
  console.log("that is the goal's slug (beeminder.com/username/slug) ie:\n");
    console.log("\tbm goal <goalslug>");
    console.log("\tbm datapoints <goalslug>");
  console.log("");
  console.log("The argument format for `createdatapoint` is as follows:\n");
    console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]");
}

function padL (s, n) {
  return ("                                  " + s).slice(-n);
}

function padR (s, n) {
  return (s + "                                     ").slice(0, n);
}

function makeid (n) {
  var longId = '';
  for (var i = 0; i <= n/14; i++) {
    longId += (Math.random() + 1).toString(36).substr(2);
  }
  return longId.substring(0, n);
}

if (argv.help) {
 printHelp();
} else if (rc && rc.split("auth_token: ")[1]) {
  var auth_token = rc.split("auth_token: ")[1].trim();
  var bm = Bee(auth_token);
  var command = argv._[0];
  if (command == "createdatapoint" || command == "cd") {
    var goalname = argv.goalname || argv.g || argv._[1];
    var value = argv.value || argv._[2];
    var comment = argv.comment || argv._[3];
    var id = argv.id || argv._[4];
    if (!goalname || value === undefined) {
      console.error("Incorrect format. Correct format is:");
      console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]");
      process.exit(1);
    }
    // ensureNumber(value);
    if (value && isNaN(parseFloat(value)) && !comment) {
      comment = value;
      value = 1;
    }
    var params = {
      value: parseFloat(value)
    };
    comment && (params.comment = comment);
    id && (params.requestid = id);
    bm.createDatapoint(goalname, params, handleErr(function (datapoint) {
      console.log(goalname + " ▶  " + datapoint.canonical);
    }));
  } else if (command == "updatedatapoint") {
    var goalname = argv.goalname || argv.g || argv._[1];
    var value = argv.value || argv._[2];
    var comment = argv.comment || argv._[3];
    var id = argv.id || argv._[4];
    if (!id) {
      id = makeid(10);
      console.log("random id generated: " + id);
    }
    if (!goalname || value === undefined) {
      console.error("Incorrect format. Correct format is:");
      console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]");
      process.exit(1);
    }
    // ensureNumber(value);
    if (value && isNaN(parseFloat(value)) && !comment) {
      comment = value;
      value = 1;
    }
    var params = {
      value: parseFloat(value),
      requestid: id,
    };
    comment && (params.comment = comment);
    bm.updateDatapoint(goalname, params, handleErr(function (datapoint) {
      console.log(goalname + " ▶  " + datapoint.canonical);
    }));

  } else if (command == "goal") {
    var goalname = argv.goalname || argv.g || argv._[1];
    bm.getGoal(goalname, bmCallback);
  } else if (command == "status") {
    var goalname = argv.goalname || argv.g || argv._[1];
    bm.getUserSkinny(handleErr(function (user) {
      var goals = user.goals;
      goals.sort(function (a, b) {
        return a.losedate - b.losedate;
      });

      var simplegoals = [];
      var lines = [];
      lines.push("-----------------------------------------------------------------");
      var next24h = true;
      function pad8 (match) {return padL(match, 8);}
      for (var i in goals) {
        var goal = goals[i];
        simplegoals.push({
          title: goal.title,
          slug: goal.slug,
          delta_text: goal.delta_text,
          losedate: goal.losedate
        });
        var derailsecs = goal.losedate - Math.ceil(Date.now()/1000);
        var deraildays = Math.floor(derailsecs/(60*60*24));
        derailsecs %= (60*60*24);
        var derailhours = Math.floor(derailsecs/(60*60));
        derailsecs %= (60*60);
        var derailmins = Math.floor(derailsecs/60);
        derailsecs %= 60;
        if (goal.losedate - Math.ceil(Date.now()/1000) > (18*60*60) && next24h) {
          lines.push("-----------------------------------------------------------------");
          next24h = false;
        }
        var derailtime = goal.limsum.replace(" 0 days", " " + (derailhours ? derailhours + " hours"  :
                  derailmins + " mins")).replace(/(.*? )/, pad8);
        lines.push("  " + user.username + "/" + padR(goal.slug, 16) + padR(goal.delta_text, 22) + derailtime);
      }
      lines.push("-----------------------------------------------------------------");
      for (var l in lines) {
        console.log(lines[l]);
      }
    }));
  } else if (command == "datapoints") {
    var goalname = argv.goalname || argv.g || argv._[1];
    bm.getDatapoints(goalname, bmCallback);
  } else if (command == "user") {
    bm.getUser(bmCallback);
  } else if (command == "charge") {
    var amount = argv.amount || argv._[1];
    var note = argv.note || argv._[2];
    var dryrun = argv.dryrun || argv._[3];
    if (!amount || isNaN(parseFloat(amount))) {
      console.error("Incorrect format. Correct format is:");
      console.log("\tbm charge <amount> <note> [<dryrun>]");
      process.exit(1);
    }
    params = {
      amount: parseFloat(amount)
    };
    note && (params.note = note);
    dryrun && (params.dryrun = true);
    bm.charge(params, bmCallback);
  } else {
    printHelp();
  }
} else {
  console.log("No ~/.bmndrrc detected... starting authentication process...");
  exec('xdg-open https://www.beeminder.com/api/v1/auth_token.json', function () {
    console.log("A browser window has opened that will show you your auth_token.\nCopy that and paste it here.");

    prompt.start();
    prompt.get('auth_token', function (err, result) {
      if (err) { return onErr(err); }
      fs.writeFile(rc_path, "[account]\nauth_token: "+result.auth_token+"\n", function (errf) {
        if (errf) { return onErr(errf); }
        console.log("Successfully wrote auth_token to ~/.bmndrrc");
      });
    });
  });
}

// http://blog.npmjs.org/post/119317128765/adding-subcommands-to-your-command-line-tool
