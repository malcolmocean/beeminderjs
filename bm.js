#! /usr/bin/env node
var Bee = require('./');
var sys = require('sys')
var exec = require('child_process').exec;
var prompt = require('prompt');
var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2));

var userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var rc_path = userhome+"/.bmndrrc"

fs = require('fs');
var exists = fs.existsSync(rc_path);
var rc = exists && fs.readFileSync(rc_path, 'utf8');

function onErr (err) {
  console.log(err);
  return 1;
}

function bmCallback (err, result) {
  if (err) {return onErr(err);}
  console.log("Successfully executed command: \n", JSON.parse(result));
}

function printHelp () {
  console.log("usage: bm <command> [<args>]\n");
  console.log("The commands currently available are:")
    console.log("\tuser\t\t\t"+"retrieve properties of the user");
    console.log("\tgoal\t\t\t"+"retrieve properties of a goal");
    console.log("\tdatapoints\t\t"+"retrieve all datapoints of a goal");
    console.log("\tcreatedatapoint, cd\t"+"post a new datapoint");
  console.log("");
  console.log("`user` takes no arguments. `goal` and `datapoints` take a single argument")
  console.log("that is the goal's slug (beeminder.com/username/slug) ie:\n")
    console.log("\tbm goal <goalslug>")
    console.log("\tbm datapoints <goalslug>")
  console.log("");
  console.log("The argument format for `createdatapoint` is as follows:\n")
    console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]")
}

if (argv.help) {
 printHelp();
} else if (rc && rc.split("auth_token: ")[1]) {
  var auth_token = rc.split("auth_token: ")[1].trim();
  var bm = Bee(auth_token);
  var command = argv._[0];
  var goalname = argv.goalname || argv.g || argv._[1];
  if (command == "createdatapoint" || command == "cd") {
    var value = argv.value || argv._[2];
    var comment = argv.comment || argv._[3];
    if (!value || isNaN(parseFloat(value))) {
      console.error("Incorrect format. Correct format is:")
      console.log("\tbm createdatapoint <goalslug> <value> [<optional comment>]")
      process.exit(1);
    }
    var params = {
      value: parseFloat(value)
    };
    comment && (params.comment = comment);
    bm.createDatapoint(goalname, params, bmCallback);
  } else if (command == "goal") {
    bm.getGoal(goalname, bmCallback);
  } else if (command == "datapoints") {
    bm.getDatapoints(goalname, bmCallback);
  } else if (command == "user") {
    bm.getUser(bmCallback);
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
      })
    });
  });
}
