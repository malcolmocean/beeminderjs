var curl = require('curlrequest');
var querystring = require('querystring');

var obj = {
  From: "+12267506789",
  Body: "LOOK AT MAH BODY"
}
var data = obj ? querystring.stringify(obj) : '';
var req = {
  url: 'http://localhost:5000/twilio/sms' + "?" + data,
  method: 'POST',
};
curl.request(req, function (err, result) {
  console.log("err", err);
  console.log("result", result);
});
