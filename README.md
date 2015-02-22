# beeminderjs
NodeJS wrapper for Beeminder API. Created for integration with [Complice](https://complice.co), a productivity app that's more *qualified*-self than quantified-self.

BeeminderJS is designed for use within NodeJS apps, although it also works in a very basic rudimentary way from command-line.

## install to your node project

```bash
npm install --save beeminder
```

### Usage as a library

```javascript
var beeminder = require('beeminder');
var bm = beeminder(auth_token);

bm.getUser(function (err, result) {
  console.log(err || result);
  // do something
});

bm.getGoal('goalslug', function (err, result) {...})

bm.getDatapoints('goalslug', function (err, result) {...})

bm.createDatapoint('goalslug', {
  value: 1, // {type: Number, required: true},
  timestamp: new Date("2015-02-21").valueOf() // {type: Number, default: now},
  comment: 'updated readme',
  sendmail: true, // if you want the user to be emailed
  requestid: 'uniqueIdRightHereOhYeahNobodyElseWillEverUseThisOne', // allows you to run command again without creating duplicate datapoints
}, function (err, result) {...})
```

## install as a command-line tool

```bash
sudo npm install --global beeminder

bm # run this once to ensure you're authenticated
```

### Usage as a command-line tool

```bash
bm user
bm goal <goalslug>
bm datapoints <goalslug>
bm createdatapoint <goalslug> <value> [<optional comment, in quotes if it has a space>]
bm cd # same as createdatapoint
```

### Example

I have the following in `.bash_aliases`, which allows me to post a [user-visible improvement](http://blog.beeminder.com/uvi/) simultaneously to beeminder ([m/complice-uvi](https://beeminder.com/m/complice-uvi)) and twitter ([@compluvi](https://twitter.com/compluvi)). Requires the twitter bash client `t`, available [here](https://github.com/sferik/t).

```bash
uvi () {
  bm cd complice-uvi 1 "$@"
  t update "$@"
}
```


## todo

- implement other endpoints
