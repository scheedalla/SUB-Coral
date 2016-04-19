/**
 * Module dependencies.
 */

// for s3 proxy
httpProxy = require('http-proxy');
var s3Proxy = httpProxy.createProxyServer();


// New Middleware for Express 4
var morgan         = require('morgan');
var bodyParser     = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var basicAuth = require('basic-auth');
var favicon = require('serve-favicon');
var errorhandler = require('errorhandler');

var express = require('express')
  //Middleware to help secure express app
  , helmet = require('helmet')
  , nodemailer = require("nodemailer")
  //Google GA
  , ua = require('universal-analytics')
  , visitor = ua('UA-6350795-19')
  // , routes = require('./routes')
  , application = require('./routes/application')
  , submission = require('./routes/submission')
  , query = require('./routes/query')
  // , user = require('./routes/user')
  , http = require('http')
  , fs = require('fs')
  , path = require('path')
  , piler = require("piler")
  , passwordHash = require('password-hash')
  , crypto = require('crypto')
  , nodemailer = require('nodemailer')
  , async = require('async');
  var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  //, DigestStrategy = require('passport-http').DigestStrategy
   , BasicStrategy = require('passport-http').BasicStrategy
   , LdapStrategy = require('passport-ldapauth').Strategy;
var consoleStamp = require('console-stamp')(console, '[yyyy-mm-dd HH:MM:ss.l]');
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

var app = express();

// Default Helmet settins minus Content Security and noCache
app.use(helmet());

app.use(helmet.contentSecurityPolicy({
  reportOnly: false, // set to true if you only want to report errors
  setAllHeaders: false, // set to true if you want to set all headers
  safari5: false // set to true if you want to force buggy CSP in Safari 5
}));

var winston = require('winston');
//Logging
var logger = morgan('combined');
// logger.log('info', 'Test Log Message', { anything: 'This is metadata' });
var Mongoose = require('mongoose');
// var encrypt = require('mongoose-encryption');
var d = require('domain').create();

d.on('error', function(er) {
    // window.console.log('Error Message=Express or Node error caught ' + er);
});

//d.run(function() {

// Express Authentication

var auth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.send(401);
  };
  var user = basicAuth(req);
  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };
  if (user.name === 'admin' && user.pass === 'secrethand5h@ke') {
    return next();
  } else {
    return unauthorized(res);
  };
};

var env = process.env.NODE_ENV;
var dbConfig, db, assetsBase, applicationBase;
switch(env) {
  case "DEV":
    dbConfig = require('./config/db_dev');
    break;
  case "QA":
    dbConfig = require('./config/db_qa');
    break;
  case "STAGE":
    dbConfig = require('./config/db_stage');
    break;
  case "PROD":
    dbConfig = require('./config/db_prod');
    break;
  default:
    dbConfig = require('./config/db_local');
    env = "QA";
}
    db = Mongoose.createConnection(dbConfig.url);
    assetsBase = dbConfig.assetsBase;
    applicationBase = dbConfig.applicationBase;
    console.log("Action=DBConnect Message='Connected to "+ env +" MongoDB'");

var dbConnectionError = false;

db.on('error', function (err) {
  // console.log("Error Message=Something went wrong with DB connection: " + err);
  if (err) // couldn't connect

  // hack the driver to allow re-opening after initial network error
  db.readyState=0;
  //db.db.close();

  dbConnectionError = true;

});

// Setting application local variables
app.locals.environment = {};
app.locals.environment.assetsBase = assetsBase;
app.locals.environment.applicationBase = applicationBase;
app.locals.environment.deployTime = Date.now();

//Elastic
var elasticSearch = require('./config/elastic');

switch(process.env.NODE_ENV) {
  case "Local":
    elasticSearch.prefix = "dev";
    break;
  case "QA":
    elasticSearch.prefix = "qa";
    break;
  case "STAGE":
    elasticSearch.prefix = "stage";
    break;
  case "PROD":
    elasticSearch.prefix = "prod";
    break;
  default:
    elasticSearch.prefix = "qa";
}


// Including the Form schema
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


// Including the Submission schema
var SubmissionSchema = require('./models/Submit.js').SubmissionSchema;
SubmissionSchema.plugin(elmongoose, { host : elasticSearch.host,
                                  port : elasticSearch.port,
                                  prefix: elasticSearch.prefix,
                                  grouper:'appId',
                                  flatten:'formData'});

var Sub = db.model('submissions', SubmissionSchema);
//Sub.migrateToA(function(err){
//     if (err){ throw err; }
//     console.log('Migration successful');
// });
Sub.sync(function (err, numSynced) {
    if(err){
      console.log('error while syncing: ', err);
    }
    console.log('number of subs synced:', numSynced);
});

SubmissionSchema.static('findByIdAndUpdate', function (id, options, callback) {
  return this.collection.findAndModify(id, options, callback);
});


// Including the end user schema
var EndUserSchema = require('./models/EndUser.js').EndUserSchema;

var EndUser = db.model('users', EndUserSchema);


// Including user schema
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

// Inlcuding the account schema
var AccountSchema = require('./models/Account.js').AccountSchema;
AccountSchema.plugin(elmongoose, { host : elasticSearch.host,
                          port : elasticSearch.port,
                          prefix: elasticSearch.prefix});
var Account = db.model('accounts', AccountSchema);

Account.sync(function (err, numSynced) {
    if(err){
      console.log('error while syncing: ', err);
    }
    console.log('number of accounts synced:', numSynced);
});


// Including the settings schema
var SettingSchema = require('./models/Settings.js').SettingSchema;
var Settings = db.model('settings', SettingSchema);


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs'); // set up ejs for templating
app.use(favicon(__dirname + '/public/images/wp-favicon.ico'));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new LocalStrategy({
              passReqToCallback: true
            },
  function(req, username, password, done) {
    username = username.toLowerCase();
    var query = "";
    if (username.indexOf("@") > -1){
      query = { emailAddress: username };
    } else {
      query = { userName: username };
    }
    User.findOne(query, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        console.log("Action=login login-type=local UserName=" + username + " Status=failure Message='No user found'");
        return done(null, false, { message: 'Invalid username or password. Please try again.' });
      }
      if (!passwordHash.verify(password, user.password)) {
        console.log("Action=login login-type=local UserName=" + username + " Status=failure Message='Incorrect password'");
        return done(null, false, { message: 'Invalid username or password. Please try again.' });
      }
      if (user.account.status == "inactive") {
        console.log("Action=login login-type=local UserName=" + username + " Status=failure Message='This account is inactive'");
        return done(null, false, { message: 'This account is inactive' });
      }
      user.lastActivity = new Date();
      // console.log("userNotified flag: " + user.userNotifiedOfInnactivity);
      if(user.userNotifiedOfInnactivity){
        // console.log("remove userNotified flag " + 1);
        user.userNotifiedOfInnactivity = false
      }
      user.save();
      console.log("Action=login login-type=local UserName=" + username + " Status=success");

      return done(null, user);
    });
  }
));


passport.use(new BasicStrategy({
              passReqToCallback: true
            },
  function(req, username, password, done) {
    User.findOne({ userName: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!passwordHash.verify(password, user.password)) { return done(null, false); }
      //update lastActivity
      user.lastActivity = new Date();
      // console.log("userNotified flag: " + user.userNotifiedOfInnactivity);
      if(user.userNotifiedOfInnactivity){
        // console.log("remove userNotified flag " + 2);
        user.userNotifiedOfInnactivity = false;
      }
      user.save();

      user.session={};
      Account.findOne({ _id: user.account.acctId }, function (err2, doc){
        if (err || !doc) {
          console.log("Action=login login-type=basic UserName=" + username + " Status=failure");
        } else {
          user.session.account = doc
          Settings.findOne({type:"account settings", name: user.session.account.type}, function(error,settings){
            if(error || !settings) {
              console.log("Action=login login-type=basic UserName=" + username + " Status=failure");
            } else {
              console.log("Action=login login-type=basic UserName=" + username + " Status=success");
              user.session.accountSettings = settings;
                    return done(null, user);

            }
          })
        }
      })
    });
  }
));


//config: authentication with passport
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'keyboard cat' , cookie:{maxAge:8 * 3600 * 1000}, resave: true, saveUninitialized: true})); //expire session after 8 hours
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride());
app.engine('html', require('ejs').__express);

// development only
if ('development' == app.get('env')) {
  app.use(errorhandler())
}

//TODO: remove this
ses = function(){};

// APPLICATION
app.post('/register', application.register(User, Account, passwordHash, crypto, async, sendSESEmail, messages, applicationBase, custMessages))
app.get('/changePass', application.getChangePass(User));
app.post('/login', application.passportAuth(passport,Account,Settings));
app.post('/login/:path', application.passportAuth(passport, applicationBase))
app.get('/login', application.forms(User, Account, Settings, Forms)); // used
app.post('/forgot' , application.forgotPassword(User, async, crypto, passwordHash, sendSESEmail, messages,applicationBase));
app.get('/forgot', application.forgot(User));
app.get('/reset/:token', application.reset(User));
app.get('/confirmEmail/:token', application.confirmEmail(User));
app.get('/register', application.afterRegistration(User));
app.get('/userManagement', application.userManagement(User,Account,Settings));
app.get('/accountManagement', application.accountManagement(User,Account,Settings));
app.get('/profile', application.profile(User, Account, Settings));
app.get('/forms', application.forms(User, Account, Settings));
app.get('/forms/:appId', application.forms(User, Account, Settings, Forms));
app.get('/', application.forms(User, Account, Settings));
app.get('/add', application.addNew(Forms));
app.get('/admin/:id', application.admin(Forms, customConfig));
app.get('/settings/:id', application.settings(Forms));

app.get('/embed-test', application.embedTest());
app.get('/edit/:id', application.edit(Forms));
app.get('/hosted/:id', application.hosted(Forms));
app.get('/addjson', application.addNewJson(Forms));
app.get('/:appId/:msId/:upId/:subId/pup', application.pup(Forms, Sub));
app.get('/approval', application.getApproval(Sub));
app.get('/approval/:appId', application.getApprovalApp(Sub));
app.get('/search/:appId', application.searchApp(Sub));
//app.get('/rolodex', application.rolodex(Sub));
app.get('/submission/:subId', application.singleSub(Sub));
app.get('/edit/:appId/:subId/:token', application.editSub(Forms,Sub));
app.get('/import', application.getImportApp(Forms));
app.post('/import/:appId/:importSource', application.importSubmissions(Forms,Sub,request));
app.post('/import', application.importSubmissions(Forms,Sub,request));
app.post('/saveSearch', application.saveSearch(Forms));


// SUBMISSION
app.options('/submission', function(req,res){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.send(200);
});
app.post('/submission', submission.submitForm(Sub, User, Forms, sendSESEmail, messages, applicationBase, subUtils.sendSubmissionNotification, crypto, subUtils.applyTokenToDraft, false));


app.post('/createEmptySubmission', submission.submitForm(Sub, User, Forms, sendSESEmail, messages, applicationBase, subUtils.sendSubmissionNotification, crypto, subUtils.applyTokenToDraft, true));
app.options('/updateSub', function(req,res){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.send(200);
});
app.post('/updateSub', submission.updateSubmission(Sub,Forms,User,sendSESEmail,messages, applicationBase, subUtils.sendSubmissionNotification, crypto, subUtils.applyTokenToDraft));
app.post('/updateSubAndMed', submission.updateSubmissionAndMediaset(Sub));

app.post('/updateSubTags', submission.updateSubmissionTags(Sub));
app.post('/bulkRemoveSubTags', submission.bulkRemoveSubTags(Sub, subUtils.multiSubPromise));
app.post('/bulkAddSubTags', submission.bulkAddSubTags(Sub, subUtils.multiSubPromise));
app.post('/bulkDeleteSubs', submission.bulkDeleteSubs(Sub));
app.post('/updateApp', submission.updateApplication(Forms));
app.post('/updateUserStatus', submission.updateUserStatus(User,messages,sendSESEmail));
app.post('/updateUserLastActiveDate', submission.updateUserActiveDate(User));
app.post('/updateAccount', submission.updateAccount(Account));
app.delete('/categories/:catId', submission.removeCategoryFromApps(Forms));
app.post('/updateUser', submission.updateUser(User));
app.post('/updateEndUser', submission.updateEndUser(EndUser));

//Client Side Logging
app.post('/clientDebuglogger', submission.clientDebuglogger());
app.post('/clientErrorlogger', submission.clientErrorlogger());

// Scheduled Jobs:
// Delete expired and unsubmitted submissions
var rule = new schedule.RecurrenceRule();
rule.hour = 23;
rule.minute = 0;
var job = schedule.scheduleJob(rule, function(){
  //subUtils.deleteExpired(Sub);
  subUtils.expireInnactiveAccounts(Account, User, sendSESEmail, messages, applicationBase)
  subUtils.checkAppStatus(Forms); //if application's run date has ended, change status to inactive
})


app.delete('/sub/:id', submission.deleteSub(Sub)); //delete a single submission
app.delete('/form/:id', submission.deleteForm(Forms)); //delete a single form
app.delete('/subs/:id', submission.deleteAllSubs(Sub,Forms)); //delete subs based on form id
app.post('/updateApproval', submission.updateApproval(Sub, Forms, User, sendSESEmail, messages, applicationBase, subUtils.sendSubmissionNotification));
app.post('/updatePupSub', submission.updatePupSubmission(Sub));
app.post('/:id/changePass', submission.changePass(User, passwordHash));
app.post('/form', submission.addNewKVP(Forms, applicationBase, request));


// QUERY
app.post('/check/username', query.checkUsername(User));
app.post('/elasticSearch/:acctId/apps', query.getFormsElasticSearch(Forms));
app.get('/elasticSearch/countApproved/:appId', query.getApprovalCountElasticSearch(Sub))
app.options('/external/elasticSearch/:appId/subs.:format', function(req,res){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.send(200);
});
app.post('/external/elasticSearch/:appId/subs.:format', query.getSubmissionAdvancedElasticSearchExternal(Sub));
app.post('/elasticSearch/:appId/subs.:format', query.getSubmissionAdvancedDateElasticSearchExternal(Sub));
app.get('/:id/app.:format', query.getApp(Forms));
app.get('/form/:id.:format', query.getApp(Forms));
app.options('/form/:id.:format', function(req,res){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.send(200);
});
app.get('/:id/mediasets/app.:format', query.getMediasets(Forms));
app.get('/userForms/:customerId', query.getCustomerForms(Forms));
app.get('/accountForms/:accountId', query.getAccountForms(Forms,User,Sub));
//app.get('/:customerId/customerSubs.:format', query.getCustomerSubs(Sub));
app.get('/accountSubs/:acctId', query.getAccountSubs(Sub));
app.get('/users/:accountId', query.getCustomers(User));
// app.get('/:accountId/rolodex.:format', query.getAccountUsers(EndUser));
app.get('/:emailId/userEmail.:format', query.getUserSubs(Sub));
app.get('/user/:customerId', query.getCustomerInfo(User));
app.get('/:customerId/customer.json', query.getCustomerInfo(User));
app.get('/getConfig', query.getConfig);
app.get('/:appId/subs.:format', passport.authenticate('basic', { session: false }), query.getSubmissionSearch(Sub));
app.get('/internal/:appId/subs.:format', query.getSubmissionSearchInternal(Sub));
app.get('/:appId/:subsStatus/submissions.:format', query.getApprovedSubmissions(Sub));
app.get('/:appId/:subsStatus/submissionsReverse.:format', query.getApprovedSubmissionsReverse(Sub));
//app.get('/elasticSearch/:appId/subs.:format', query.getSubmissionElasticSearch(Sub));
//app.get('/elasticSearch/:appId/subsOR.:format', query.getSubmissionAdvancedElasticSearchOr(Sub));
app.get('/:appId/viewSubs.:format', passport.authenticate('basic', { session: false }), query.getSubmissionSearch(Sub));
app.post('/multiAppViewSubs', query.customElasticSubmissionSearch(Sub))
app.options('/multiAppViewSubs', function(req,res){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.send(200);
});
app.get('/external/:appId/viewSubs.:format', query.getSubmissionSearchExternal(Sub));
app.get('/:appId/tags.:format', query.getSubmissionTags(Sub));
app.get('/:appId/tagsOptions.:format', query.getSubmissionTagsOptions(Sub));
app.get('/:appId/subDate.:format', query.getSubmissionDate(Sub));
app.get('/elasticSearch/:appId/subDate.:format', query.getSubmissionDateElasticSearch(Sub));
app.get('/sub/:subId.:format', query.getUniqueSubmission(Sub));
app.post('/check/email', query.checkEmail(User,Account));
app.get('/:subId/:msId/mediaset.:format', query.getUniqueMediaset(Sub));
app.get('/account/:accountId', query.getAccountInfo(Account,Forms));
app.get('/:accountId/account.json', query.getAccountInfo(Account,Forms));
app.get('/:subId/sub.:format', query.getUniqueSubmission(Sub));
// USER
// app.get('/users', user.list);

// OTHER
app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    console.log("Action=logout Status=success");
    res.redirect('/login'); //Inside a callback… bulletproof!
  });
});

//API CALLS
app.get('/api/v1/:appId/viewSubs.:format', query.getSubmissionSearchExternal(Sub));
app.get('/api/v1/:appId/tags.:format', query.getSubmissionTags(Sub));
app.get('/api/v1/:appId/subDate.:format', query.getSubmissionDate(Sub));
app.get('/api/v1/:subId/sub.:format', query.getUniqueSubmission(Sub));

app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

// 404
app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

///////////// END OF ROUTES /////////////
var srv = http.createServer(app).listen(app.get('port'), function(){
  console.log('Action=StartUp Message="Express server listening on port ' + app.get('port')+'"');
});

//});//end d.run