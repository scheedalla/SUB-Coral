

var schedule = require('node-schedule');
var request = require('request');
var elmongoose = require('elmongoose');
var fileJSON = require('./messages.json');
var messages = fileJSON;
var customMsgsJSON = require('./config/cust-email-messages.json');
var custMessages = customMsgsJSON;
var subUtils = require('./sub-utils');
var sendSESEmail = subUtils.sendSESEmail;
//custom configuration for the client
var customConfig = require('./config/custom-config')


var FormSchema = require('./models/FormSchema.js').FormSchema;
FormSchema.plugin(elmongoose, { host : elasticSearch.host,
                          port : elasticSearch.port,
                          prefix: elasticSearch.prefix});
var Forms = db.model('forms', FormSchema);

Forms.sync(function (err, numSynced) {
    if(err){
      console.log('error while syncing: ', err);
    }
    console.log('number of apps synced:', numSynced);
});

var SubmissionSchema = require('./models/Submit.js').SubmissionSchema;
SubmissionSchema.plugin(elmongoose, { host : elasticSearch.host,
                                  port : elasticSearch.port,
                                  prefix: elasticSearch.prefix,
                                  grouper:'appId',
                                  flatten:'formData'});

var Sub = db.model('submissions', SubmissionSchema);

Sub.sync(function (err, numSynced) {
    if(err){
      console.log('error while syncing: ', err);
    }
    console.log('number of subs synced:', numSynced);
});

SubmissionSchema.static('findByIdAndUpdate', function (id, options, callback) {
  return this.collection.findAndModify(id, options, callback);
});

var EndUserSchema = require('./models/EndUser.js').EndUserSchema;

var EndUser = db.model('users', EndUserSchema);

var UserSchema = require('./models/User.js').UserSchema;
UserSchema.plugin(elmongoose, { host : elasticSearch.host,
                          port : elasticSearch.port,
                          prefix: elasticSearch.prefix});
var User = db.model('customers', UserSchema);

User.sync(function (err, numSynced) {
    if(err){
      console.log('error while syncing: ', err);
    }
    console.log('number of users synced:', numSynced);
});

var AccountSchema = require('./models/Account.js').AccountSchema;
AccountSchema.plugin(elmongoose, { host : elasticSearch.host,
                          port : elasticSearch.port,
                          prefix: elasticSearch.prefix});
var Account = db.model('accounts', AccountSchema);

Account.sync(function (err, numSynced) {
    if(err){
      // console.log('error while syncing: ', err);
    }
    // console.log('number of accounts synced:', numSynced);
});

var SettingSchema = require('./models/Settings.js').SettingSchema;
var Settings = db.model('settings', SettingSchema);
