//application.js holds all page and get requests

//Global variable: stores json vs jsonp
//some methode users need jsonp so we want to let them choose that in their api call to sub
var format;

//TODO: move me to submission.js
//Description: Attempts to create a new user and sends an email to the new user with further instructions
//TriggeredBy: post request from the registration view.
//Renders: login.ejs w/ success/error message and redirect URL if present.

exports.register = function(User, Account, passwordHash, crypto, async, sendSESEmail, messages, applicationBase, custMessages) {
  return function(req, res) {
    console.log("req body", req.body);

    if (req.body.invite){
      var user = new User(req.body.user);
      console.log("user",user)
      async.waterfall([
        function(done) {
          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');
            user.resetPasswordToken = token;
            user.save(function(error, app) {
            if (error || !app) {
              res.json({ error : error });
            } else {
              done(err, token);
            }
          });

          });
        },
      function(token, done) {
        var linkTo = req.headers.origin;
        if(!req.headers.origin){
          linkTo = applicationBase;
        }
        var to = [user.emailAddress];
        var sesMessage = {
               Subject: {
                  Data: 'You have been invited to join SUB!'
               },
               Body: {
                   Html: {
                       Data: 'To complete your registration and confirm your email address, please click on the following link, or paste this into your browser:<br><br>'
                    + linkTo + '/reset/' + token + '<br><br>'
                    + messages.emailConfirmEmail + "<a href='mailto:"+user.emailAddress+"' target='_blank'>"+user.emailAddress+"</a>. <br><br>"
                    + messages.emailContactInfo

                   }
                }
           }
        //send SES email
        sendSESEmail(messages.fromEmail, to, sesMessage)
          .then(function(res, error){
              if(error){
                  res.render('login.ejs', {
                  successMessage : 'null',
                  errorMessage : 'Could not send an email to ' + user.emailAddress,
                  redirect: null
                });
                done(error, 'done');
              } else{
                console.log("Action=register login-type=local User=" + user.userName+ " Status='email sent'");
                res.render('login.ejs', {
                  successMessage : 'An e-mail has been sent to ' + user.emailAddress + '  with further instructions.',
                  errorMessage : 'null',
                  redirect: null
                });
                done(err, 'done');
              }
            })

      }
    ], function(err) {
      if (err) {
        console.log("Action=register login-type=local User=" + user.userName + " Status=failure");
        res.json({error: err});
      }
    });
    } else {
      var user = new User(req.body);
      var account = new Account({"type":"Free", "status":"ok"});

async.waterfall([
        //Save account and pass along account ID
        function(done) {
            account.save(function(error, account){
              done(error, account._id)
          })
        },
        //create user with account id and save user.
        function(token, done) {

          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');
            user.emailConfirmationToken = token;
          });
          user.userName = user.userName.toLowerCase();
          user.password = passwordHash.generate(user.password);
          user.account = {};
          user.account.acctId = token;
          user.account.role = "user";
          user.save(function(error, app) {
            if (error || !app) {
              res.render('login.ejs', {
                  account : req.account,
                  user : req.user, // get the user out of session and pass to template
                  errorMessage : "There was a problem with your registration.",
                  successMessage : 'null',
                  redirect: null
                 });
            } else {
              var to = [user.emailAddress];
              var sesMessage = {
                     Subject: {
                        Data: 'Welcome to SUB!'
                     },
                     Body: {
                         Html: {

                         Data: custMessages.emailNewRegistration
                        + "<br><br>Please bookmark "+req.headers.origin + " for your reference.<br><br>"
                        + messages.emailContactInfo
                         }
                      }
                 }
              //send SES email
              sendSESEmail(messages.fromEmail, to, sesMessage)
              .then(function(res, error){
                if(error){
                    res.render('login.ejs', {
                    successMessage : 'null',
                    errorMessage : 'Could not send an email to ' + user.emailAddress,
                    redirect: null
                  });
                  done(error, 'done');
                } else{
                  //success
                  res.render('login.ejs', {
                    successMessage : 'An e-mail has been sent to ' + user.emailAddress + ' with further instructions.',
                    errorMessage : 'null',
                    redirect: null
                  });

                  done(err, 'done');
                }
              })


                console.log("Action=register login-type=local UserName=" + user.userName + " Status=success");
                res.render('login.ejs', {
                  account : req.account,
                  user : req.user, // get the user out of session and pass to template
                  errorMessage : 'null',
                  successMessage : "You have registered successfully.",
                  redirect: null
                 });
            }
          });

        }
    ], function(err) {
      if (err) {
        console.log("Action=register User=" + user.userName + " Status=failure" + " Message=" + err);
        res.json({error: err});
      }
    });

    };
  }
};

//Description: Plain old passport authentication for free users
//TriggeredBy: Posts to /login, assuming no loaded sub-module has it's own /login workflow
//Renders: login.ejs w/ success/error message and redirect URL
exports.passportAuth = function(passport, applicationBase) {
  return function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {

    if(info){
      return res.render('login.ejs', {
          errorMessage : info.message,
          successMessage : 'null',
          redirect: req.body.redirect
       })
    }
    if (err) { return next(err); }
    if (!user) {
      return res.render('login.ejs', {
          errorMessage : "Invalid username or password. Please try again.",
          successMessage : 'null',
          redirect: req.body.redirect
       })
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      if(req.body.redirect && req.body.redirect != "null"){
        return res.redirect('/forms?redirect=' + req.body.redirect);
      }else {
        return res.redirect('/forms');
      }
    });
  })(req, res, next);
};
};

exports.passportAuthWP = function(passport, applicationBase) {
  return function(req, res, next) {

  passport.authenticate('ldapauth', {session:true}, function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      console.log("Action=login login-type=twpn Status=failure Message='Invalid username or password'");
      return res.render('login.ejs', {
        // js: res.locals.profilejs
          errorMessage : "Invalid username or password. Please try again.",
          successMessage : 'null',
          redirect: req.body.redirect
       })
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      if(req.body.redirect && req.body.redirect != "null"){
        return res.redirect('/forms?redirect=' + req.body.redirect);
      } else{
        return res.redirect('/forms');
      }
    });
  })(req, res, next);
};
};

//TODO: remove reset var here and in changePass.ejs and profileController
//Description: loads up the change password page w/ a form for confirm old password and choose a new one
//TriggeredBy: get request to /changePass
//Renders: changePass.ejs, with user doc and reset=false
exports.getChangePass = function(User) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    }else{
    res.render('changePass.ejs', {
      user : req.user, // get the user out of session and pass to template
      reset : false
     });
    }
  }
}

//Description: Displays login.ejs
//TriggeredBy: Get requests to /login
//Renders: login.ejs. error/success and redirect must be returned but can be left null.
exports.login = function(User) {
  return function(req, res) {
    User.find({}, function(error, user) {
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    });
  };
};

//Description: Displays forgot password ejs with form to enter email address of account
//TriggeredBy: get request to /forgot
//Renders: forgot.ejs must pass error/success message but they can remain null
exports.forgot = function(User) {
  return function(req, res) {
    User.find({}, function(error, user) {
       res.render('forgot.ejs', {
        errorMessage : 'null',
        successMessage : 'null'
       })
    });
  };
};

//TODO: move this to submission.js
//Description: When visited, sets a flag in the database acknowldeging that this user's email is verified.
//TriggeredBy: clicking on the /confirmEmail link in the registration confirmation email
//Renders: forms.ejs with, account, user and account settings objects or login ejs with success/error message and redirect url
exports.confirmEmail = function(User) {
  return function(req, res) {
    User.findOne({ emailConfirmationToken: req.params.token }, function(err, user) {
      if (!user) {
        if(req.user){
          return res.render('forms.ejs', {
                user : req.user, // get the user out of session and pass to template
                account : req.session.account,
                errorMessage : 'Email confirmation token is invalid or has already been used.',
                successMessage : null
                });
        } else {
          return res.render('login.ejs', {
              errorMessage : 'Email confirmation token is invalid or has already been used.',
              successMessage : 'null',
              redirect: null
            });
        }
      }
      user.emailConfirmationToken = null;
      user.save(function(err) {
          //continue
        });
      if(req.user){
        return res.render('forms.ejs', {
              user : req.user, // get the user out of session and pass to template
              account : req.session.account,
              errorMessage : 'null',
              successMessage : "Email address confirmed!"
              });
      } else {
        return res.render('login.ejs', {
            errorMessage : 'null',
            successMessage : "Email address confirmed!",
            redirect: null
          });
      }

    });
  }
};

//Description: When a user visits /reset/:token, finds user in database w/ that token and renders profile.ejs with form to reset password
//TriggeredBy: visiting /reset/:token which is linked to in the reset password email
//Renders: resetPass.ejs, profile.ejs or login.ejs
exports.reset = function(User) {
  return function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token}, function(err, user) {
      if (!user) {
        console.log("Action='reset password' login-type=local Status=failure Message='User not found'");
        if(req.user){
          res.render('profile.ejs', {
              user : req.user, // get the user out of session and pass to template
              account : req.session.account,
              errorMessage : "This password reset token is invalid or has expired.",
              successMessage: null
              });
        } else {
          return res.render('login.ejs', {
            errorMessage : 'This password reset token is invalid or has expired.',
            successMessage : 'null',
            redirect: null
          });
        }
      } else {
        user.resetPasswordToken = null;
        user.save();
        res.render('resetPass.ejs', {
          user: user,
          reset: true
        });
      }
    });
  }
};

//Description: After a user registers take them back to login page w/ a success message
//TriggeredBy: user successfully submits registration form
//Renders: login.ejs
exports.afterRegistration = function(User) {
  return function(req,res){
    return res.render('login.ejs', {
            errorMessage : 'null',
            successMessage : "Thank you for registering!",
            redirect: null
          })
  }
}

//TODO: move this to submission.js
//Description: Sends an email to the account specified by the user with a link to reset their password
//TriggeredBy: Post to the forgot Password form
//Renders: forgot.ejs
exports.forgotPassword = function(User, async, crypto, passwordHash, sendSESEmail, messages, applicationBase) {
  return function(req,res){

    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },

    function(token, done) {
      User.findOne({ emailAddress: new RegExp('^'+req.body.email+'$', "i")}, function(err, user) {
        if (!user) {
         console.log("Action='forgot password' login-type=local email="+req.body.email+" Status=failure Message='Email address not found'");
          return res.render('forgot.ejs', {
            errorMessage : 'Email address not found.',
            successMessage : null
          })
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var linkTo = req.headers.origin;
      if(!req.headers.origin){
        var protocol = (applicationBase == '//localhost:3000/' || applicationBase == '//wp-sub.wpprivate.com/')?'http:':'https:'
        linkTo = protocol + applicationBase

      }
      var to = [user.emailAddress];
      var sesMessage = {
             Subject: {
                Data: 'SUB: Forgot your password?'
             },
             Body: {
                 Html: {
                     Data: 'Please click on the following link, or paste this into your browser to update your SUB password:<br><br>'
          + linkTo + '/reset/' + token + '<br><br>'
          // + messages.emailForgotPassword + "<a href='mailto:"+user.emailAddress+"' target='_blank'>"+user.emailAddress+"</a>. <br><br>"
          + messages.emailContactInfo
                 }
              }
         }
      sendSESEmail(messages.fromEmail,to,sesMessage)
        .then(function(sesResponse,error){
          if(error){

            return res.render('forgot.ejs', {
              successMessage : 'null',
              errorMessage : 'Could not send an email to ' + req.body.email
            });
            done(error, 'done');
          } else{
            //success
            console.log("Action='forgot password' login-type=local email="+req.body.email+" Status='email sent'");
            return res.render('forgot.ejs', {
              successMessage : 'An e-mail has been sent to ' + req.body.email + ' with further instructions.',
              errorMessage : null
            });
            done(error, 'done');
          }
        })

    }
  ], function(err) {
    if (err) {
      console.log("Action='forgot password' login-type=local email="+req.body.email+" Status=failure Message='"+err+"'");
      res.render('forgot.ejs', {
          errorMessage : err,
          successMessage : null
        });
    }
  });
  }
};

//Description: Opens user management page. Only accessible to admin users on non free accounts
//TriggeredBy: get request to /userManagement
//Renders: login.ejs or userManagement.ejs
exports.userManagement = function(User, Account, Settings) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    }else{
    res.render('userManagement.ejs', {
      user : req.user,
      account : req.session.account,
      errorMessage : 'null',
      successMessage : 'null',
      redirect: null
      });


    }
  };
};

//Description: Displays account management page. Eventually this is where users will upgrade their accounts
//TriggeredBy: Get requests to /accountManagement
//Renders: login.ejs or accountManagement.ejs
exports.accountManagement = function(User, Account, Settings) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    }else{
    res.render('accountManagement.ejs', {
      user : req.user,
      account : req.session.account
      });


    }
  };
};

//Description: Logs user in to create session.  Redirects to internship tool
//TriggeredBy: Get requests to /internship
exports.internship = function(User, Account, Settings) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : null,
        successMessage : null,
        redirect: "http://internship.subsaastest.com/"
       })
    }else{
    res.redirect('http://internship.subsaastest.com/');
    }
  };
};

//Description: Shows pricing and account types, based on values in account settings collection
//TriggeredBy: get requests to /offerings
//Renders: login.ejs or offerings.ejs
exports.offerings = function(User, Account, Settings) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    }else{
    res.render('offerings.ejs', {
      user : req.user,
      account : req.session.account,
      errorMessage: null,
      successMessage: null
      });


    }
  };
};

//Description: displays all forms visible to this user/account
//TriggeredBy: Get requests to /forms
//Renders: login.ejs, forms.ejs, or a redirect whatever the redirect req param is.
exports.forms = function(User, Account, Settings, App) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    }else{
    if(req.session.account == null){
      Account.findOne({ _id: req.user.account.acctId }, function (err, doc){
        if (err || !doc) {
          res.json({Error: err});
        } else {
          //update lastActivity. Used to determine how active a user is
          console.log("update last activity for acct: " + doc._id)
          doc.lastActivity = new Date();
          doc.save();

          req.session.account = doc;
          if(req.query.redirect && req.query.redirect != 'null' && req.query.redirect != 'undefined'){
            res.redirect(req.query.redirect);
          }

          else {
            res.render('forms.ejs', {
            user : req.user,
            account : req.session.account,
            errorMessage : 'null',
            successMessage: 'null'

            });
          }
        }
      })

    } else{

    res.render('forms.ejs', {
      user : req.user,
      errorMessage : 'null',
      account : req.session.account,
      successMessage: 'null'
      });

    }
    }
  };
};

//Description: Show a user's profile page
//TriggeredBy: get requests to /profile
//Renders: login.ejs, profile.ejs
exports.profile = function(User, Account, Settings) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       })
    }else{
    if(req.session.account == null){
      Account.findOne({ _id: req.user.account.acctId }, function (err, doc){
        if (err || !doc) {
          res.json({Error: err});
        } else {
          //update lastActivity.
          doc.lastActivity = new Date();
          doc.save();
          req.session.account = doc;

          res.render('profile.ejs', {
          user : req.user,
          account : req.session.account,
          errorMessage : 'null',
          successMessage: null
          });

        }
      })

    } else{

    res.render('profile.ejs', {
      user : req.user,
      errorMessage : 'null',
      account : req.session.account,
      successMessage: null
      });

    }
    }
  };
};

//Description: display create from workflow
//TriggeredBy: get requests to /add
//Renders: login.ejs, form.ejs or add.ejs
exports.addNew = function(App) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       });
    }else{
    var error = false;
    res.render('add.ejs', {
      appId : null,
      user : req.user,
      edit : false,
      account: req.session.account._id
     });

    }
  };
};

//Description: Display admin view for a form, where user can view submissions, edit form, and share form
//TriggeredBy: Get requests to /admin/:formId
//Renders: login.ejs or admin.ejs
exports.admin = function(App, customConfig) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: "/admin/" + req.params.id
       });
    }else{
    App.findOne({ _id : req.params.id }, function(error, application) {
      if(application == null){
        res.render('404.ejs', {
        });
      } else if (application.accountId == req.session.account._id){
        res.render('admin.ejs', {
          appId : req.params.id,
          user : req.user,
          account : {_id:"test"},
          activeTab:req.query.tab,
          embedCssRef:customConfig.embedCssRef
        });
      } else {
        res.render('forms.ejs', {
          user : req.user,
          account : req.session.account,
          errorMessage : "Access Denied: User " + req.user.userName + " does not have acces to that form.",
          successMessage: null
          });
        }
    });


    }
  };
};

//Description: Displays a single submission
//TriggeredBy: get requests to /submission/:subid
//Renders: login.ejs or submision.ejs
exports.singleSub = function(Sub) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       });
    }else{
        res.render('submission.ejs', {
        subId : req.params.subId,
        accountId : req.session.account._id,
        user : req.user
    });
    }
  };
};


//Description: Displays a single submission for internship
//TriggeredBy: get requests to /submission/:subid
//Renders: login.ejs or submision.ejs
exports.internshipSub = function(Sub) {
  return function(req,res){
    return res.render('internship.ejs', {
             subId : req.params.subId,
            accountId : req.session.account._id,
            user : req.user
          })
  }
};




//Description: Edit a single submission
//TriggeredBy: get requests to /edit/:appId/:subId/:token
//Renders: login.ejs or hosted.ejs
exports.editSub = function(App,Sub) {
  return function(req, res) {
    res.removeHeader('X-Frame-Options');
    format = req.params.format;
    App.findOne({ _id : req.params.appId }, function(error, application) {
      if(error || !application){
        res.render('hosted.ejs', {
          appId : req.params.appId,
          socialTitle : "SUB Form",
          socialDescription : "",
          socialURL : "http://noname.com/images/sub_logo_new.png"
        });
      } else {
        if(!application.socialTitle){
          application.socialTitle = application.appName;
        }
        if(!application.socialDescription){
          application.socialDescription = "";
        }
        if(!application.logoURL){
          application.logoURL = "http://noname.com/images/sub_logo_new.png";
        }
        res.render('hosted.ejs', {
          appId : req.params.appId,
          socialTitle : application.socialTitle,
          socialDescription : application.socialDescription,
          socialURL : application.logoURL,
          subId : req.params.subId,
          token : req.params.token
       });
      }

    });
  }
};

//Description: Displays form to import form data via csv
//TriggeredBy: Get requests to /import
//Renders: import.ejs
exports.getImportApp = function(App) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       });
    }else{
    res.render('import.ejs', {
      user : req.user,
      account : req.session.account
     });
    }
  };
}

//TODO: move to submission.js
//Description: Takes data from a csv and populates submissions to a form from it
//TriggeredBy: Post to /import
//Renders: nothing. Move this to submission.js
exports.importSubmissions = function(App,Sub,request){
  return function(req, res) {
    if(!req.user){
       res.json({ error : "Not logged in" });
    }else{
      App.findOne({ _id : req.body.appId }, function(error, application) {
        if(error || !application){
          res.json({ error : error });
        } else if(req.user._id != application.customerId){
          res.json({ error : "User " + req.user.userName + " does not have access to this application" });
        } else {
          //parse the csv
          strDelimiter = ",";
          // Regular expression to parse the CSV values.
          var objPattern = new RegExp(
              (
                  // Delimiters.
                  "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
                  // Quoted fields.
                  "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
                  // Standard fields.
                  "([^\"\\" + strDelimiter + "\\r\\n]*))"
              ), "gi" ); //end regex

          // Arrays to hold our data and pattern matching groups.
          var arrData = [[]];
          var arrMatches = null;

          // Loop over the regex matches

          //get csv
          request("https:"+application.importCsv, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              while (arrMatches = objPattern.exec( body )){
                  // Get the delimiter that was found.
                  var strMatchedDelimiter = arrMatches[ 1 ];

                  // Check to see if the given delimiter has a length
                  // (is not the start of string) and if it matches
                  // field delimiter. If id does not, then we know
                  // that this delimiter is a row delimiter.
                  if (
                      strMatchedDelimiter.length &&
                      strMatchedDelimiter !== strDelimiter
                      ){

                      // This is a new row. Add a new row to arrData.
                      arrData.push( [] );
                  }
                  var strMatchedValue;
                  //look at the value after the delimeter
                  if (arrMatches[ 2 ]){
                      // This is a quoted value. Unescape any double quotes.
                      strMatchedValue = arrMatches[ 2 ].replace(
                          new RegExp( "\"\"", "g" ),
                          "\""
                          );

                  } else {
                      // This is a non-quoted value.
                      strMatchedValue = arrMatches[ 3 ];

                  }

                  // Add the value to arrData
                  arrData[ arrData.length - 1 ].push( strMatchedValue );
              }//end while
            //create array of app form field unique ids in the same order as the data in the csv
            var headers = [];
            for(var i=0; arrData[0].length > i; i++){
              for(var c=0; application.appFormFields.length > c; c++){
                if(application.appFormFields[c].importName == arrData[0][i]){
                  headers[i] = {};
                  headers[i].uniqueId = application.appFormFields[c].uniqueId;
                  headers[i].fieldType = application.appFormFields[c].fieldType;
                }
              }//end for loop
            }//end for loop
            //for every array in arrData after 0 (0 is headers)
            var subsJson = [];
            //create submissions
            for(var i=1; arrData.length - 1 > i; i++){
              var sub = {
                "formData" : {
                },
                "customerId" : application.customerId,
                "appId" : application._id,
                "accountId" : application.accountId,
                "tags" : [],
                "mediasets" : [],
                "createdDate" : Date(),
                "submitted" : true,
                "approved" : application.autoApproved,
              }//end sub
              for(var c=0; arrData[i].length > c; c++){
                //if headers[c].fieldType is a special type then store accordingly...
                if(headers[c].fieldType == "wufooUpload"){
                  //if fieldType is wufooUpload, extract link to file download, or store null if no link.
                  sub.formData[headers[c].uniqueId] = null;
                  var split1 = arrData[i][c].split("(");
                  if(split1.length == 2){
                    var split2 = split1[1].split(")");
                    if(split2[0].indexOf("http") == 0){
                      sub.formData[headers[c].uniqueId] = split2[0];
                    }
                  }
                } else if(headers[c].fieldType == "checkbox" && req.body.importSource != "wufoo"){
                //if this field is a checkbox, store values as an object w/ a list of values set to true
                  var values = arrData[i][c].split(",");
                  var valuesObject = {};
                  for(var t=0; values.length > t; t++){
                    valuesObject[values[t]] = true;
                  }
                  sub.formData[headers[c].uniqueId] = valuesObject;
                } else if(headers[c].fieldType == "checkbox" && req.body.importSource == "wufoo"){
                  //if this is a checkbox from wufoo, combine fields with matching names before creating checkbox object
                  if(sub.formData[headers[c].uniqueId]){
                    sub.formData[headers[c].uniqueId][arrData[i][c]] = true;
                  } else {
                    sub.formData[headers[c].uniqueId] = {};
                    sub.formData[headers[c].uniqueId][arrData[i][c]] = true;
                  }
                } else if(req.body.importSource == "wufoo"){
                  if(sub.formData[headers[c].uniqueId]){
                    sub.formData[headers[c].uniqueId] = sub.formData[headers[c].uniqueId] + ", " + arrData[i][c];
                  } else {
                    sub.formData[headers[c].uniqueId] = arrData[i][c];
                  }
                }else{
                //if this field is not a checkbox store value as a string
                  sub.formData[headers[c].uniqueId] = arrData[i][c];
                }
              }//end for loop
              var newSub = new Sub(sub);
              subsJson.push(newSub);
            }//end for loop
            Sub.create(subsJson, function (err, subs) {
              if (err){
                res.json({error: "Could not update database"});
              } else {
                //update application and return submissions
                application.importRequired = false;
                application.save();
                res.json({submissions: subsJson});
              }

            });


          } //end of "if got csv"
          else { //else if you didn't get the csv
              console.log("Action='get CSV' AppId=" + application._id + "Status=failure");
            } //end else
          })//end request for csv
        }//end else
      })//end find one app request

    }
  }
}

//TODO: move this to submission.js
//Description: Save a search query to an application for use later in the admin submissions view
//TriggeredBy: Post to /saveSearch
//Renders: Nothing, move to submission.js
exports.saveSearch = function(App) {
  return function(req, res) {
    App.findOne({ _id : req.body.appId }, function(error, application) {
      if(error || !application){
        res.json({error:error});
      }else{
        //make sure savedSearches array exists
        if(!application.savedSearches){
          application.savedSearches = [];
        }

        //if this came in with an overwrite flag, find the search that needs to be overwritten
        if(req.body.overwrite){
          console.log("overwrite " + req.body.search.name)
          for(var key in application.savedSearches){
            if(application.savedSearches[key].name === req.body.search.name){
              console.log("search to overwrite: ", application.savedSearches[key].searchOptions.group.rules)
              application.savedSearches[key] = req.body.search;
              console.log("new search: ", application.savedSearches[key].searchOptions.group.rules)
            }
          }
        } else{ //if the overwrite flag is off, just append this search to savedSearches
          application.savedSearches.push(req.body.search);
        }
        application.save(function(error, app) {
        if (error || !app) {
          res.json({ error : error });
        } else {
          res.json({application : app});
        }})
      }
    })

  }
}


//Description: Display embed test form
//TriggeredBy: Get request to /embed-test
//Renders: embed-test.html
exports.embedTest = function(App) {
  return function(req, res) {

    res.render('embed-test.html');

  };
};

//Description: Display settings on a form
//TriggeredBy: Get request to /settings
//Renders: login.ejs or settings.ejs
exports.settings = function(App) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       });
    }else{
    res.render('settings.ejs', {
      appId : req.params.id, // get the user out of session and pass to template
      user : req.user,
     });
    }
  };
};

//Description: Display admin edit partial
//TriggeredBy: Get request to /edit from the admin page
//Renders: login.ejs, partials/create.ejs
exports.edit = function(App) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       });
    }else{
    res.render('partials/create.ejs', {
      appId : req.params.id, // get the user out of session and pass to template
      user : req.user,
      edit : true,
      account: req.session.account._id
     });
    }
  };
};

//Description: Display hosted form
//TriggeredBy: get to /hosted
//Renders: hosted.ejs
exports.hosted = function(App) {
  return function(req, res) {
    res.removeHeader('X-Frame-Options');
    format = req.params.format;
    App.findOne({ _id : req.params.id }, function(error, application) {
      if(error || !application){
        res.render('404.ejs', {
        });
      } else{
        if(!application.socialTitle){
          application.socialTitle = application.appName;
        }
        if(!application.socialDescription){
          application.socialDescription = "";
        }
        if(!application.logoURL){
          application.logoURL = "http://noname.com/images/sub_logo_new.png";
        }
        res.render('hosted.ejs', {
          appId : req.params.id,
          socialTitle : application.socialTitle,
          socialDescription : application.socialDescription,
          socialURL : application.logoURL,
          subId : null,
          token : null
       });
      }
    });

  }
};

//TODO: I think we can delete this
//Description: Displays new field partial on the create form page
//TriggeredBy: get request to /addJson from the create form page
//Renders: login.ejs or addNewJson.html
exports.addNewJson = function(App) {
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: null
       });
    }else{
      App.find({}, function(error, app) {
        res.sendfile('views/addNewJson.html', {
        });
      });
    }
  };
};

//Description: Displays photo uploader inside of the pup modal called form the hosted form
//TriggeredBy: Get request to /pup, called from the hosted form
//Renders: pup-view.ejs
exports.pup = function(App, Sub){
    return function(req, res) {
    res.removeHeader('X-Frame-Options');
    App.findOne({ _id : req.params.appId }, function(error, application) {
      res.render('pup-view.ejs', {
         app : application,
         appid : req.params.appId,
         msid : req.params.msId,
         upid : req.params.upId
       });
    });
  }
};

//Description: Display the approval tool
//TriggeredBy: get request to /approval called from the admin form page
//Renders: login.ejs or approval.ejs
exports.getApproval = function(Sub) {
  return function(req, res) {
    if(!req.user){
      res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: "/admin/" + req.params.appId
       });
    }
    else{
      res.render('approval.ejs', {
        appId : req.params.appId,
        user : req.user,
        account : req.session.account
      });
    }
  }
};

//TODO: figure out why this is different from getApproval
//Description: Display the approval tool
//TriggeredBy: get request to /approval called from the admin form page
//Renders: login.ejs or approval.ejs
exports.getApprovalApp = function(Sub) {
  return function(req, res) {
    if(!req.user){
      res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: "/admin/" + req.params.appId
       });
    }
    else{
        res.render('approval.ejs', {
        appId : req.params.appId,
        user : req.user,
        account : req.session.account
      });
    }
  }
};

//Description: Display search for a form
//TriggeredBy: Get request to /search
//Renders: login.ejs or partials/search.ejs
exports.searchApp = function(Sub) {
  return function(req, res) {
    if(!req.user){
      res.render('login.ejs', {
        errorMessage : 'null',
        successMessage : 'null',
        redirect: "/admin/" + req.params.appId
       });
    }
    else{
        res.render('partials/search.ejs', {
        appId : req.params.appId,
        user : req.user,
        account : req.session.account
      });
    }
  }
};
