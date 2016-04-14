//submission.js handles all requests to save or update documents  in the database

//Global variable: stores json vs jsonp
//some methode users need jsonp so we want to let them choose that in their api call to sub
var format;

var Mongoose = require('mongoose');


//Description: Saves a form submission to the submission collection
//TriggeredBy: Post request to /submission
//RequestBody: a submission document to be inserted into mongodb
exports.submitForm = function(Sub, User, Forms, sendSESEmail, messages, applicationBase, sendSubmissionNotification, crypto, applyTokenToDraft, isMediasetSave) {
  return function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    var sub = new Sub(req.body);
    console.log("entire sub:")
    console.log(sub)
    sub.save(function(error, sub) {
      if (error || !sub) {
        res.json({ error : error });
      } else {
        console.log("is sub submitted: " + sub.submitted)
        if(sub.submitted && !isMediasetSave){
          sub.editToken = null;
            sendSubmissionNotification(sub, Forms, User, sendSESEmail, messages, applicationBase);
            console.log("Action='new submission' SubId="+sub._id+" AppId="+sub.appId+" Status=success");
            res.json({ submissionInfo : sub });
        console.log("is sub draft: " + sub.isDraft + " isMSSave:"+isMediasetSave)
        } else if(sub.isDraft && !isMediasetSave){
          if(!sub.editToken){
            applyTokenToDraft(crypto,sub)
            .then(function(savedDoc){
              sendSubmissionNotification(sub, Forms, User, sendSESEmail, messages, applicationBase);
              console.log("Action='new submission' SubId="+sub._id+" AppId="+sub.appId+" Status=success");
                res.json({ submissionInfo : sub });
            })

          } else{
            sendSubmissionNotification(sub, Forms, User, sendSESEmail, messages, applicationBase);
            res.json({ submissionInfo : sub });
          }
        }
        else{
          res.json({ submissionInfo : sub });
        }
      }
    });
  };
};

//Description: Update an existed submission in the database
//TriggeredBy: Post request to /updateSub
//RequestBody: a submission document to be inserted into mongodb
exports.updateSubmission = function(Sub, Forms, User, sendSESEmail, messages, applicationBase, sendSubmissionNotification, crypto, applyTokenToDraft) {
  return function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    var sub = new Sub(req.body);
    var conditions = { _id: sub._id }
    , update = { $set: { formData: sub.formData }, $set: {tags: sub.tags}};

    Sub.findOne({ _id: sub._id }, function (err, doc){
      if (err || !doc) {
        res.json({ error : err });
      } else {
        //get this submission's status before the update. This decides whether we send an email notification
        var originalStatus = doc.submitted;
        //Add new mediasets. Do not overwrite existing mediasets!
        for(var i=0; sub.mediasets.length > i; i++){
          var exists = false;
          for(var c=0; doc.mediasets.length > c; c++){
            if(doc.mediasets[c] != null && sub.mediasets[i] != null && doc.mediasets[c].mediasetId == sub.mediasets[i].mediasetId){ exists = true; }
          }
          if(!exists && sub.mediasets[i]){
            doc.mediasets.push(sub.mediasets[i]);
          }
        }
        if(sub.submitted){
          doc.editToken = null;
        }

        doc.formData = sub.formData;
        doc.tags = sub.tags;
        doc.submitted = sub.submitted;
        doc.isDraft = sub.isDraft;
        doc.cookies = sub.cookies;
        doc.approved = sub.approved;
        doc.save();
        console.log("Action='update submission' SubId="+sub._id+" AppId="+sub.appId+" Status=success");
        //TODO: Clean this mess up
        //If this sub's submitted status was false and now it's true, send a notification email
        if(!originalStatus && sub.submitted) {
            sendSubmissionNotification(doc, Forms, User, sendSESEmail, messages, applicationBase);
            res.json({ submissionInfo : doc });
        } else if(sub.isDraft){
          //if doc doesn't already have an edit token, create one and save.
          if(!doc.editToken || doc.editToken == "" || doc.editToken == "undefined"){
            applyTokenToDraft(crypto,doc)
            .then(function(savedDoc){
              sendSubmissionNotification(savedDoc, Forms, User, sendSESEmail, messages, applicationBase);
              res.json({ submissionInfo : savedDoc });
            })

          } else {
            sendSubmissionNotification(doc, Forms, User, sendSESEmail, messages, applicationBase);
            res.json({ submissionInfo : doc });
          }
        } else{
          res.json({ submissionInfo : doc });
        }
      }

    });
  };
};


//Description: Update tags on a submission (as of Aug 2015 only removing tags in bulk is implemented)
//TriggeredBy: Post request to /updateSubTags
//RequestBody: a request object w/ tagsToRemove array (more options to come?)
exports.updateSubmissionTags = function(Sub){
  return function(req,res) {
    var tagsToRemove = req.body.tagsToRemove;
    if(tagsToRemove && tagsToRemove.length > 0){
      var conditions = {appId: req.body.id ,tags:{ $in: tagsToRemove }}
      var update = { $pull: { "tags": { $in: tagsToRemove } } }
      var options = { multi: true };
      Sub.update(conditions,update,options,function(err,numAffected){
        if(err){
          console.log("Action='update Submission tags' AppId="+req.body.id+" Status=failure Message='" + err + "'");
          res.json({ error : err });
        } else{
          console.log("Action='update Submission tags' AppId="+req.body.id+" Status=success Message='Tags "+tagsToRemove+" removed from "+numAffected+" submissions'")
          res.json({ numAffected : numAffected});
        }
      })
    }
  }
}

//Description: Remove tags in array from submissions in array of subids
//TriggeredBy: Post request to /bulkRemoveSubTags
//RequestBody: a request object w/ subs and tags arrays
exports.bulkRemoveSubTags = function(Sub, multiSubPromise){
  return function(req,res) {
    var tagsToRemove = req.body.tags;
    if(tagsToRemove && tagsToRemove.length > 0){
      var conditions = {_id: { $in:req.body.subs } ,tags:{ $in: tagsToRemove }}
      var update = { $pull: { "tags": { $in: tagsToRemove } } }
      var options = { multi: true };
      Sub.find(conditions,function(err,subsToUpdate){
        for(var subKey in subsToUpdate){
          console.log("for sub ");
          console.log(subsToUpdate[subKey]);
          for(var tagKey in tagsToRemove){
            console.log("Does " +  subsToUpdate[subKey].tags + " contain "+ tagsToRemove[tagKey])
            var index = subsToUpdate[subKey].tags.indexOf(tagsToRemove[tagKey]);
            if (index > -1) {
              subsToUpdate[subKey].tags.splice(index, 1);
            }
          }
          multiSubPromise(subsToUpdate).then(function(err){
            res.json({Submissions: subsToUpdate, Error: err})
          });
        }
      })

    }
  }
}

//Description: Add tags in array from submissions in array of subids
//TriggeredBy: Post request to /bulkAddSubTags
//RequestBody: a request object w/ subs and tags arrays
exports.bulkAddSubTags = function(Sub, multiSubPromise){
  return function(req,res) {
    var tagsToAdd = req.body.tags;
    if(tagsToAdd && tagsToAdd.length > 0){
      var subIds = []
      for(var key in req.body.subs){
        subIds.push(Mongoose.Types.ObjectId(req.body.subs[key]))
      }
      var conditions = {_id: { $in:subIds }}
      var update = { $push: { "tags": { $each: tagsToAdd } } }
      var options = { multi: true };
      console.log(conditions)
      console.log(update)
      Sub.find(conditions,function(err,subsToUpdate){
        for(var subKey in subsToUpdate){
          for(var tagKey in tagsToAdd){
            if(subsToUpdate[subKey].tags.indexOf(tagsToAdd[tagKey]) == -1){
              subsToUpdate[subKey].tags.push(tagsToAdd[tagKey])
            }
          }
        }
        multiSubPromise(subsToUpdate).then(function(err){
          res.json({Submissions: subsToUpdate, Error: err})
        });
      })

    }
  }
}

//Description: Delete multiple submissions
//TriggeredBy: Post request to /bulkDeleteSubs
//RequestBody: a request object w/ subs array
exports.bulkDeleteSubs = function(Sub){
  return function(req,res) {
      var conditions = {_id: { $in:req.body.subs } }
      var options = { justOne: false };
      Sub.remove(conditions,options,function(err,numAffected){
        if(err){
          console.log("Action='update Submission tags' AppId="+req.body.id+" Status=failure Message='" + err + "'");
          res.json({ error : err });
        } else{
          console.log("Action='update Submission tags' AppId="+req.body.id+" Status=success Message='Tags "+tagsToRemove+" removed from "+numAffected+" submissions'")
          res.json({ numAffected : numAffected});
        }
      })

  }
}

//Description: Update an existing submission's mediaset
//TriggeredBy: Post request to /updateSubAndMed
//RequestBody: a submission document to be inserted into mongodb
exports.updateSubmissionAndMediaset = function(Sub) {
  return function(req, res) {
    // Pass to next layer of middleware
    var sub = new Sub(req.body);
    var conditions = { _id: sub._id }
    , update = { $set: { formData: sub.formData }, $set: {tags: sub.tags}};

    Sub.findOne({ _id: sub._id }, function (err, doc){
      if (err || !doc) {
        console.log("Action='update submission and mediaset' SubId="+sub._id+" AppId="+sub.appId+" Status=failure");
        res.json({ error : err });
      } else {
        doc.formData = sub.formData;
        doc.mediasets = sub.mediasets;
        doc.tags = sub.tags;
        doc.submitted = sub.submitted;
        doc.cookies = sub.cookies;
        doc.approved = sub.approved;
        doc.save();
        console.log("Action='update submission and mediaset' SubId="+sub._id+" AppId="+sub.appId+" Status=success");
        res.json({ submissionInfo : doc });
      }

    });
  };
};

//Description: updates an existing application in the database
//TriggeredBy: Post request to /updateApp
//RequestBody: an application document to be inserted into mongodb
exports.updateApplication = function(Forms) {
  return function(req, res) {
    // Pass to next layer of middleware
    var app = new Forms(req.body);

    Forms.findOne({ _id: app._id }, function (err, doc){
      if (err || !doc) {
        res.json({ error : err });
        console.log("Action='update form' AppId="+ app._id+" Status=failure");
      } else {
        doc.tags = app.tags;
        doc.appName = app.appName;
        doc.active = app.active;
        doc.activeStartDate = app.activeStartDate;
        doc.activeEndDate = app.activeEndDate;
        doc.appDescription = app.appDescription;
        doc.appUrl = app.appUrl;
        doc.callToAction = app.callToAction;
        doc.confirmation = app.confirmation;
        doc.autoApproved = app.autoApproved;
        doc.appFormFields = app.appFormFields;
        doc.activeEndDate = app.activeEndDate;
        doc.inactiveMessage = app.inactiveMessage;
        doc.mediaSets = app.mediaSets;
        doc.isDraft = app.isDraft;
        doc.draftLastSaved = app.draftLastSaved;
        doc.draftLastSavedUser = app.draftLastSavedUser;
        doc.lastSavedUserId = app.lastSavedUserId;
        doc.logoUploadId = app.logoUploadId;
        doc.logoURL = app.logoURL;
        doc.importRequired = app.importRequired;
        doc.importCsv = app.importCsv;
        doc.importSource = app.importSource;
        doc.submissionNotifications = app.submissionNotifications;
        doc.submissionNotificationSubjectLine = app.submissionNotificationSubjectLine;
        doc.submissionNotificationEmailTo = app.submissionNotificationEmailTo;
        doc.submissionNotificationMessage = app.submissionNotificationMessage;
        doc.submissionNotificationShowResponse = app.submissionNotificationShowResponse;
        doc.submissionNotificationShowLink = app.submissionNotificationShowLink;
        doc.endUserNotification = app.endUserNotification;
        doc.endUserNotificationSubjectLine = app.endUserNotificationSubjectLine;
        doc.endUserNotificationMessage = app.endUserNotificationMessage;
        doc.endUserNotificationEmail = app.endUserNotificationEmail;
        doc.approvalNotification = app.approvalNotification;
        doc.approvalNotificationSubjectLine = app.approvalNotificationSubjectLine;
        doc.approvalNotificationMessage = app.approvalNotificationMessage;
        doc.approvalNotificationEmail = app.approvalNotificationEmail;
        doc.tinyUrl = app.tinyUrl;
        doc.categories = app.categories;
        doc.shared = app.shared;
        doc.defaultImgFieldExt = app.defaultImgFieldExt;
        doc.requireAll = app.requireAll;
        doc.socialShareButtons = app.socialShareButtons;
        doc.socialTitle = app.socialTitle;
        doc.socialDescription = app.socialDescription;
        doc.submissionLimitAmount = app.submissionLimitAmount;
        doc.submissionLimit = app.submissionLimit;
        doc.policyURL = app.policyURL;
        doc.replyTo = app.replyTo;
        doc.submissionEdit = app.submissionEdit;
        doc.submissionEditSubjectLine = app.submissionEditSubjectLine;
        doc.submissionEditMessage = app.submissionEditMessage;
        doc.messageNextToDraftBtn = app.messageNextToDraftBtn;
        doc.hasCaptcha = app.hasCaptcha;

        doc.save();
        console.log("Action='update form' AppId="+ app._id+" Status=success UserId="+app.lastSavedUserId);
        res.json({ applicationInfo : doc });

      }

    });
  };
};


//Description: Updates an existing end user in the database
//TriggeredBy: Post request to /updateEndUser
//RequestBody: an endUser document to be inserted into mongodb
exports.updateEndUser = function(EndUser) {
  return function(req, res) {

    var endUser = new EndUser(req.body);

    //Rename fields
    endUser.emailAddress = endUser.formData.email;
    endUser.phoneNumber = endUser.formData.phoneNumber;
    endUser.userName = endUser.formData.firstAndLastName;
    endUser.forms = [];
    endUser.forms.push(endUser.appId);

    //Delete formData
    delete endUser.formData;

    EndUser.findOne({ emailAddress: endUser.emailAddress }, function (err, doc){
      if (err || !doc) {
        endUser.save(function(error, endUser) {
            if (error || !endUser) {
              res.json({ error : error });
              console.log("Action='End User Added' Status=fail");
            } else {
              res.json({ submissionInfo : endUser });
              console.log("Action='End User Added' Status=success");
            }
          });
      } else {
        //The end user exisits - do something here.
        doc.forms.push(endUser.appId);
        doc.userName = endUser.userName;
        doc.phoneNumber = endUser.phoneNumber;
        doc.save();
        res.json({ updatedEndUser : doc });
        console.log("Action='End User Update' Status=success Message='User already exists and was updated'")
      }

    });
  };
};

//Description: update existing user's lastActiveDate in the database
//TriggeredBy: Post request to /updateUserLastActiveDate
//RequestBody: a user document w/ values to be inserted in mongodb
exports.updateUserActiveDate = function(User) {
  return function(req, res) {
    // Pass to next layer of middleware
    var user = new User(req.body);

    User.findOne({ _id: user._id }, function (err, doc){
      if (err || !doc) {
        console.log("Action='update user last active date' UserId="+user._id+" Status=failure");
        res.json({ error : err });
      } else {
        doc.activeDate = user.activeDate;
        doc.save();
        console.log("Action='update user last active date' UserId="+user._id+" Status=success");
        res.json({ userInfo : doc });
      }

    });
  };
};

//Description: updates an existing user's status in the database
//TriggeredBy: Post request to /updateUserStatus
//RequestBody: a user document with values to be inserted into mongodb
exports.updateUserStatus = function(User, messages, sendSESEmail) {
  return function(req, res) {
    // Pass to next layer of middleware
    var user = new User(req.body);

    User.findOne({ _id: user._id }, function (err, doc){
      if (err || !doc) {
        console.log("Action='update user status' UserId="+user._id+" Status=failure");
        res.json({ error : err });
      } else {
        doc.account.status = user.account.status;
        doc.account.role = user.account.role;
        doc.save();
        console.log("Action='update user status' UserId="+user._id+" Status=success");
        res.json({ userInfo : doc });
        var to = [user.emailAddress];
        var sesMessage = {Subject: {
                  Data: 'Your SUB account has been modified'
               },
               Body: {
                   Html: {
                       Data: "Your SUB account now has the status: " + user.account.status
                            + " and the role: " + user.account.role
                            + messages.emailStatusUpdate + "<a href='mailto:"+user.emailAddress
                            + "' target='_blank'>"+user.emailAddress+"</a>. <br><br>"
                            + messages.emailContactInfo
                   }
                }
           }
        sendSESEmail(messages.fromEmail,to,sesMessage)
          .then(function(res){
            res.render('login.ejs', {
              successMessage : 'An e-mail has been sent to ' + user.emailAddress + ' with further instructions.',
              errorMessage : null
            });
          })
      }

    });
  };
};

//Description: deletes a submission from the database
//TriggeredBy: Delete request to /sub
//RequestBody: none
exports.deleteSub = function(Sub) {
  return function(req, res) {
    Sub.findOne({ _id : req.params.id },function(err,submission){
      if(submission != null) {
        submission.remove(function(error, media){
          if (error){
            console.log("Action='delete submission' SubId="+req.params.id+" Status=failure");
            res.json({error : error});
          } else if (err){
            console.log("Action='delete submission' SubId="+req.params.id+" Status=failure");
            res.json({error : error});
          } else {
            console.log("Action='delete submission' SubId="+req.params.id+" Status=success");
            res.json({submission : null});
          }
        });
      }
      else {
        res.json({error: "Submission not found"});
      }
    });
  }
};

//Description: deletes a form from the database
//TriggeredBy: Delete request to /form
//RequestBody: none
exports.deleteForm = function(Forms) {
  return function(req, res) {
    Forms.findOne({ _id : req.params.id },function(err,application){
      application.remove(function(error, media){
        if (error){
          console.log("Action='delete form' AppId="+req.params.id+" Status=failure");
          res.json({error : error});
        } else if (err){
          console.log("Action='delete form' AppId="+req.params.id+" Status=failure");
          res.json({error : error});
        } else {
          console.log("Action='delete form' AppId="+req.params.id+" Status=success");
          res.json({application : null});
        }
      });
    });
  }
};

//Description: Deletes all subs for a form in the database
//TriggeredBy: Delete request to /subs
//RequestBody: none
exports.deleteAllSubs = function(Sub,Forms) {
  return function(req, res) {
    Sub.find({appId : req.params.id}, function(error,submissions){
      if(submissions.length == 0){
        res.json({submission: null});
      } else{
        for (index in submissions) {
          submissions[index].remove(function(err, submission){
            if(error){
              console.log("Action='delete all subs' AppId="+req.params.id+" Status=failure Message='"+error+"'");
              res.json({error: error});
            } else if (err){
              console.log("Action='delete all subs' AppId="+req.params.id+" Status=failure Message='"+err+"'");
              res.json({error : err});
            } else {
              console.log("Action='delete all subs' AppId="+req.params.id+" Status=success");
              res.json({submission : null});
            }
          });
        }
      }
    });
  }
};

//Description: Update approval value on an existing submission in the database
//TriggeredBy: Post request to /updateApproval
//RequestBody: an approval document to be inserted into mongodb
exports.updateApproval = function(Sub, Forms, User, sendSESEmail, messages, applicationBase, sendSubmissionNotification) {
    return function(req, res) {
    Sub.findOne({ _id: req.body.id }, function (err, doc){
      if (err || !doc) {
        console.log("Action='update approval' SubId="+req.body.id+" Status=failure"+req.body);
        res.json({ error : err });
      } else {
        doc.approved = req.body.approved;
        doc.save();
        console.log("Action='update approval' SubId="+req.body.id+" Status=success"+req.body);
        res.json({ submissionInfo : doc });
      } if(doc.approvalNotification && doc.approved){
          var sub = new Sub(doc);
          console.log(doc);
          sendSubmissionNotification(sub, Forms, User, sendSESEmail, messages, applicationBase);
          res.json({ submissionInfo : Sub });
          // console.log(Sub);
      }

    });
  }
}

//Description: updated mediaset on an existing submission in the database
//TriggeredBy: Post request to /updatePupSub
//RequestBody: a submission document with mediaset values to be inserted into mongodb
exports.updatePupSubmission = function(Sub) {
  return function(req, res) {
    // Pass to next layer of middleware
    var sub = new Sub(req.body);
    Sub.findOne({ _id: sub._id }, function (err, doc){
      if (err || !doc) {
        console.log("Action='update pup submission' SubId="+sub._id+" Status=failure");
        res.json({ error : err });
      } else {
        doc.mediasets = sub.mediasets;
        doc.save();
        console.log("Action='update pup submission' SubId="+sub._id+" Status=success");
        res.json({ submissionInfo : doc });
      }

    });
  };
};

//Description: update an existing user's password in the database
//TriggeredBy: Post request to /changePass
//RequestBody: password values from the change pass form
exports.changePass = function(User, passwordHash){
  return function(req,res){
    User.findOne({ _id: req.params.id }, function (err, doc){
      if (err || !doc) {
        console.log("Action='reset password' UserId="+req.params.id+" Status=failure Message='"+err+"'");
        res.json({ error : err });
      } else {
        var hashedPass = passwordHash.generate(req.body.newPass);
        if(req.body.reset){
          doc.password = hashedPass;
          doc.save();
          console.log("Action='reset password' UserId="+req.params.id+" Status=success Message='Password updated'");
          res.json({ success : "Password Updated" });
        }
        if(passwordHash.verify(req.body.oldPass, doc.password)){
          doc.password = hashedPass;
          doc.save();
          console.log("Action='reset password' UserId="+req.params.id+" Status=success Message='Password updated'");
          res.json({ success : "Password Updated" });
        }

      }

    });
  }
}

//Description: Create a new application in the database
//TriggeredBy: Post request to /form
//RequestBody: a application document to be inserted into mongodb
exports.addNewKVP = function(Forms, applicationBase, request) {

  return function(req, res) {
    var app = new Forms(req.body);

    //callback when App is saved to mongo
    var appSaveCallback = function(error, app) {
        if (error || !app) {
          console.log("Action='form created' Status=failure");
          res.json({ error : error });
        } else {
          console.log("Action='form created' AppId="+ app._id+" Status=success");
          res.json({ applicationInfo : app });
        }
      }
      app.save(appSaveCallback);
  };
};


//Description: update existing account in the database
//TriggeredBy: Post request to /updateAccount
//RequestBody: an account document to be inserted into mongodb
exports.updateAccount = function(Account){
  return function(req, res){
      var acct = new Account(req.body);
      Account.findOne({_id: acct._id}, function(err, doc){
        if(err || !doc){
          console.log("Action='update account' AccountId="+ acct._id+" Status=failure");
          res.json({ error : err });
        }
        else{
          doc.name = acct.name;
          doc.type = acct.type;
          doc.status = acct.status;
          doc.categories = acct.categories;
          doc.save();
          console.log("Action='update account' AccountId="+ acct._id+" Status=success");
          res.json({accountInfo:doc});
        }
      })
  };
}

//Description: update the last activity date for an existing user
//TriggeredBy: Post request to /updateUserLastActiveDate
//RequestBody: a user document to be inserted into mongodb
exports.updateUserActiveDate = function(User) {
  return function(req, res){
      var user = new User(req.body);
      User.findOne({_id: user._id}, function(err, doc){
      if (err || !doc) {
        console.log("Action='update user last active date' UserId="+user._id+" Status=failure");
        res.json({ error : err });
      } else {
        doc.activeDate = user.activeDate;
        doc.save();
        console.log("Action='update user last active date' UserId="+user._id+" Status=success");
        res.json({ userInfo : doc });
      }

    });
  };
}

//Description: update an existing user document in the database
//TriggeredBy: Post request to /updateUser
//RequestBody: a user document to be inserted into mongodb
exports.updateUser = function(User){
  return function(req, res){
      var user = new User(req.body);
      User.findOne({_id: user._id}, function(err, doc){
        if(err || !doc){
          console.log("Action='update user' UserId="+ user._id+" Status=failure");
          res.json({ error : err });
        }
        else{
          doc.customerName = user.customerName;
          doc.username = user.username;
          doc.emailAddress = user.emailAddress;
          doc.defaultCategory = user.defaultCategory;
          doc.activeDate = user.activeDate;
          doc.save();
          console.log("Action='update user' UserId="+ user._id+" Status=success");
          res.json({accountInfo:doc});
        }
      })
  };
}

//Description: update an existing application in the database, remove category from app
//TriggeredBy: Delete request to /categories
//RequestBody: none
exports.removeCategoryFromApps = function(Forms) {
  return function(req, res) {
    var catQuery, catUpdate;
    if(req.params.catId){
      catQuery = {
      categories:{
        $elemMatch:{_id:req.params.catId}
        }
      }

      catUpdate={
        $pull:{
          categories:{_id:req.params.catId}
        }
      }
    }

    Forms.update(catQuery, catUpdate, {multi:true}, function(err, doc){
      if(err || !doc){
        res.json({error:err});
        console.log("Action='deleting category "+req.params.catId+" from apps' Status=failure Message='" + err+"'");
      }
      else{
        res.json({apps:doc});
        console.log("Action='deleting category "+req.params.catId+" from apps' Status=success");
      }
    });


  };
}

//Description: Client Side Debug Log
//TriggeredBy: Client Activity
//RequestBody: Client Log Message
exports.clientDebuglogger = function() {
  return function(req, res){
      var log = (req.body);
      console.log(log);
  };
};

//Description: Client Side Error Log
//TriggeredBy: Client Activity
//RequestBody: Client Log Message
exports.clientErrorlogger = function() {
  return function(req, res){
      var log = (req.body);
      console.log(log);
  };
};
