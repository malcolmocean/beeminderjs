# beeminderjs
NodeJS wrapper for the Beeminder API. Created for integration with [Complice](https://complice.co), a productivity app that's more *qualified*-self than quantified-self.

BeeminderJS is designed for use within NodeJS apps, although it also works in a very basic rudimentary way from command-line. I'm open to people contributing new functions to either purpose!

## Install to your node project

```bash
npm install --save beeminder
```

### Usage as a library

Now supports both callbacks and promises. All methods return a promise whether you pass it a callback or not. Refer to the [beeminder API docs](http://api.beeminder.com/#beeminder-api-reference) for information on goal creation parameters or what will be returned when calling these endpoints.

```javascript
var beeminder = require('beeminder');
var bm = beeminder(auth_token);

bm.getUser(function (err, result) {
  console.log(err || result);
  // do something
});

bm.getGoal('goalslug', function (err, result) {...})

bm.createGoal('goalslug', params, function (err, result) {...})

bm.getDatapoints('goalslug', function (err, result) {...})

bm.createDatapoint('goalslug', {
  value: 1, // {type: Number, required: true},
  timestamp: new Date("2015-02-21").valueOf() // {type: Number, default: now},
  comment: 'updated readme',
  sendmail: true, // if you want the user to be emailed
  // requestid allows you to run command again without creating duplicate datapoints
  requestid: 'thisHasToBeAlphanumericWhichIsWhyThereAreNoSpaces',
}, function (err, result) {...})

bm.createGoal('goalslug', params).then(function () {
  return bm.createDatapoints('goalslug', [{...}])
}).then(function () {
  res.send('Created goal and added datapoints')  
}).catch(...)

```

## Install as a command-line tool

```bash
sudo npm install --global beeminder

bm # run this once to ensure you're authenticated
```

### Usage as a command-line tool

```bash
bm user
bm status # outputs a list of goals sorted by derail time
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

# example
uvi "UVIs will be posted more frequently because I can now post them from command line :D"
```

## todo

- implement other endpoints (feel free to ask for them or to submit pull requests)
