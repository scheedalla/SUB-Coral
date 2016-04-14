//SES config
var aws = require('aws-sdk');
aws.config.region = 'us-east-1';
var ses = new aws.SES({apiVersion: '2010-12-01'});

var Promise = require('promise');
var request = require('request');

exports.multiSubPromise = function(subs){
  var count = 0;
  var interval = subs.length;
  var errors = [];
  return new Promise(function (fulfill, reject){
    for(var key in subs){
      subs[key].save(function(err,sub){
        count++;
        if(err){
          errors.push(err);
        }
        if(count == interval){
          fulfill(errors);
        }
      });
    }
  });
}

exports.applyTokenToDraft = function(crypto,sub){
  return new Promise(function (fulfill, reject){
    crypto.randomBytes(20, function(err, buf) {
      var token = buf.toString('hex');
      sub.editToken = token;
      sub.save(function(error,submission) {
        if(!error && submission){
          fulfill(submission);
        } else{
          reject(error);
        }
      });
    });
  })
}

exports.sendSESEmail = function(from, to, message, replyTo){
  return new Promise(function (fulfill, reject){
    //specify options for the ses send email request
    var emailOptions = {
        Source: from,
        Destination: { ToAddresses: to },
        Message: message
      }

    //if replyTo array is specified, set ReplyToAddresses ses option
    if(replyTo){
      emailOptions.ReplyToAddresses = replyTo;
    }

    //send email with amazon ses
    ses.sendEmail( emailOptions, function(err, data) {
        // console.log("Action='sending email' Status=success Subject='" + message.Subject.Data + "' ToAddress=" + to, err);
        fulfill(data);
      });
  });
}

//Description:
//  triggered when a submission is created for a form with email notifications turned on
//Takes:
//
exports.sendSubmissionNotification = function(sub, App, User, sendSESEmail, messages, applicationBase){
  console.log("send submission notification..." + sub)
//get the app to see if any notifications are on for this form.
App.findOne({ _id: sub.appId }, function (err, app){
  if (err || !app) {
    console.log("Action='sending submission confirmation email' Status=failure Message='" + err+"'");
  } else {
    //gather arrays of end user notification emailaddresses and settings
    var endUserEmail = [];
    var endUserSubjectLine = "";
    var endUserMessage = "";
    var approvalNotificationEmail = [];
    var approvalNotificationSubjectLine = "";
    var approvalNotificationMessage = "";
    var appMediaSetFormFields;
    if(app.endUserNotification){
      for(var q=0;q<app.endUserNotificationEmail.length;q++){
        endUserEmail.push(sub.formData[app.endUserNotificationEmail[q]]);
      }
      endUserSubjectLine = app.endUserNotificationSubjectLine;
      if(app.endUserNotificationMessage){
        endUserMessage = app.endUserNotificationMessage;
      }

    }
    else
    {
      for(var i=0; app.appFormFields.length > i; i++){
      if(app.appFormFields[i].endUserNotification && sub.formData){
        endUserEmail.push(sub.formData[app.appFormFields[i].uniqueId]);
        if(app.appFormFields[i].endUserNotificationSubjectLine) endUserSubjectLine=app.appFormFields[i].endUserNotificationSubjectLine;
        if(app.appFormFields[i].endUserNotificationMessage) endUserMessage=app.appFormFields[i].endUserNotificationMessage;
        console.log("Action='sending submission confirmation email' Status=success");
        console.log('endUserEmail: '+ endUserEmail+', endUserSubjectLine: '+ endUserSubjectLine+', endUserMessage: '+ endUserMessage);
      }
    }

    }



    if(app.approvalNotification){
        console.log('approval start..');
      for(var q=0;q<app.approvalNotificationEmail.length;q++){
        approvalNotificationEmail.push(sub.formData[app.approvalNotificationEmail[q]]);
        console.log(approvalNotificationEmail);
      }
      if(app.approvalNotificationMessage){
        approvalNotificationSubjectLine = app.approvalNotificationSubjectLine;
        console.log(approvalNotificationSubjectLine);
      }
      if(app.approvalNotificationMessage){
        approvalMessage = app.approvalNotificationMessage;
        console.log(approvalMessage);
      }
      console.log("Action='sending submission approval email' Status=success");
      console.log('approval email: '+ approvalNotificationEmail+', approval subject: '+ approvalNotificationSubjectLine+', approval message: '+ approvalMessage);
    }


    //if there are end user or admin user notifications to be sent create the formData string to display in those emails//
    if(app.submissionNotifications || endUserEmail.length > 0){
      var formData ="";
      for(var i=0; app.appFormFields.length > i ; i++){
        formData = formData + "<label style='font-weight:bold'>"
                  + app.appFormFields[i].fieldName + ":</label> <br>";
          //if this field is a checkbox, make it readable then append
          if(app.appFormFields[i].fieldType == "checkbox"){
            for(var checked in sub.formData[app.appFormFields[i].uniqueId]){
              formData = formData + checked + "<br>";
            }
            formData = formData + "<br>";
          //other field types can just be appended as strings
          }
          else if (app.appFormFields[i].fieldType == "date"|| app.appFormFields[i].fieldType == "pastDate" || app.appFormFields[i].fieldType == "futureDate"){
          var date = (sub.formData[app.appFormFields[i].uniqueId])?new Date(sub.formData[app.appFormFields[i].uniqueId]):"";
          var readableDate = (date)?(date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear():"";
          formData = formData + readableDate +"<br><br>";

        }
        else if((app.appFormFields[i].fieldType == "radio" || app.appFormFields[i].fieldType == "dropdown")&&app.appFormFields[i].isConditional){
          var subVal;
            var formDataVal = (sub.formData[app.appFormFields[i].uniqueId])?sub.formData[app.appFormFields[i].uniqueId]:"";
            if(app.appFormFields[i].fieldType == "radio"){

              formDataVal = formDataVal.optionValue;
              if(formDataVal){
                subVal = sub.formData[app.appFormFields[i].uniqueId].optionValue;
              }

            }
            else{
              subVal = sub.formData[app.appFormFields[i].uniqueId];
            }
            formData = formData + formDataVal +"<br><br>";
            // console.log("sub.formData: ", sub.formData);
            var options = app.appFormFields[i].fieldTypeOptionsArray;
            for(var m=0;m<options.length;m++){

            // console.log("options[m]: ", options[m]);
            // console.log("sub.formData[app.appFormFields[i].uniqueId]", sub.formData[app.appFormFields[i].uniqueId]);
            if(options[m].optionValue == subVal){
                var condFields = (options[m].conditionalFields)?options[m].conditionalFields:"";
                for(var n=0;n<condFields.length;n++){
                  var condFieldVal = (sub.formData[condFields[n].uniqueId])?sub.formData[condFields[n].uniqueId]:"";
                  var condFormData = (condFieldVal)?"<label style='font-weight:bold'>"+ condFields[n].fieldName + ":</label> <br>":"";
                  var checkedVals = "";
                  if(condFields[n].fieldType == "checkbox"){
                    // checkedVals = condFieldVal;
                    for (var checked in condFieldVal){
                      checkedVals = checkedVals + checked + ",";
                    }
                    formData = formData + condFormData + checkedVals + "<br><br>";
                  }
                  else if (condFields[n].fieldType == "date"|| condFields[n].fieldType == "pastDate" || condFields[n].fieldType == "futureDate"){
                    var date = (sub.formData[condFields[n].uniqueId])?sub.formData[condFields[n].uniqueId]:"";

                    var readableDate = (date)?(date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear():"";
                    formData = formData + readableDate +"<br><br>";
                  }
                  else{
                    formData = formData + condFormData + condFieldVal + "<br><br>";
                  }

                }
            }

            }
          }
          //if field is a mediaset of some type
          else if(app.appFormFields[i].fieldType == "mediaSet" || app.appFormFields[i].fieldType == "mediaSetDoc" || app.appFormFields[i].fieldType == "mediaSetVid" || app.appFormFields[i].fieldType == "mediaSetAudio"){

            var id = app.appFormFields[i].mediaSetId, thisMediasetPos, metadata="";

            for(var s=0;s<app.mediaSets.length;s++){
              if(app.mediaSets[s]._id==id){
                thisMediasetPos = s;
              }
            }



            for(var k=0;k<sub.mediasets.length;k++){
              if (sub.mediasets[k] != null && sub.mediasets[k].mediasetId == id && sub.mediasets[k].media && sub.mediasets[k].media != undefined && sub.mediasets[k].media != null){
                try{
                  for(var j=0;j<sub.mediasets[k].media.length;j++){

                    var thisMedia = sub.mediasets[k].media[j];
                    // console.log('thisMedia= ', thisMedia);

                    for(var u in thisMedia.mediasetFormData){
                      var thisFieldName;
                      for (var t=0;t<app.mediaSets[thisMediasetPos].mediaSetFormFields.length;t++){

                        if(u == app.mediaSets[thisMediasetPos].mediaSetFormFields[t].uniqueId){
                          thisFieldName = app.mediaSets[thisMediasetPos].mediaSetFormFields[t].fieldName;
                        }

                      }

                      metadata= metadata+thisFieldName+": "+thisMedia.mediasetFormData[u]+"<br>";
                    }

                    formData = formData +thisMedia.originalName+": "+thisMedia.mediaUrl+"<br>"+metadata;
                    metadata="";
                  }
                } catch(err){
                  // console.log("Caught Error sending email notification. sub=" + sub);
                }
              }
              else{
                // console.log("Action='Error we can't detect in send submission' Status=failure Message='" + err+"'");
              }
            }

          }

          else{
            var formDataVal = (sub.formData[app.appFormFields[i].uniqueId])?sub.formData[app.appFormFields[i].uniqueId]:"";
            formData = formData + formDataVal +"<br><br>";
            //decode values before sending
            formData = formData.replace(/\r\n|\n|\r/gm, '<br />');
          }

          console.log("formData: ", formData);

      }//end for loop through all the form fields



      //che
    }//end checking if the email notification is turned on

  if(app.submissionNotifications && !sub.isDraft){
  //get form owner's email address
  User.findOne({ _id: sub.customerId }, function (err, user){
  if (err || !user) {
    // console.log("Action='sending submission confirmation email' Status=failure Message='" + err+"'");
  } else {

      var to = [user.emailAddress];
      var subject = 'New Submission for "' + app.appName+'"';
      var protocol = (applicationBase == '//localhost:3000/')?'http:':'https:'
      if(app.submissionNotificationSubjectLine){


        //START: CUSTOM SUBJECT LINE
        subject = app.submissionNotificationSubjectLine;
        var indices = [], orgIndices = [], ids=[];
        // console.log("Before: ",subject);
        //get all the indices where $ is located
        for (var s=0;s<subject.length;s++){
                  if(subject[s] === "$")indices.push(s);
                }

        if(indices.length > 0 && indices.length % 2 == 0){

          //organize them into objects in an array
        for(var i=0; i<indices.length;i++){
            if(i%2 == 0) {
                orgIndices.push({start:indices[i]+1, end: indices[i+1]});
            }
        }
        //find the coded ids in the subject line and put in an array
        orgIndices.forEach(function(obj){
            var word = subject.substring(obj.start, obj.end);
            ids.push(word);

        });
        //replace all the coded ids with the correct values
        var newSubject;
        for(var d=0; d<ids.length;d++){
            var find = "$"+ids[d]+"$", replace = sub.formData[ids[d]];
            //if the replaced value has not been defined
            if(!replace){
              replace = "";
            }
            //if the replaced value is a date
            else if (replace.length > 23 && replace.slice(-1) == "Z") {
               var date = new Date(replace);
              date = (date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear();
              replace = date;
            }
            if(d==0)newSubject = subject.replace(find, replace);
            else newSubject = newSubject.replace(find, replace);
        }
        subject = newSubject;
        // console.log("After: ", subject);
        //END: CUSTOM SUBJECT LINE
        }


      }
      if(app.submissionNotificationEmailTo){
        console.log("Action='new submission'  AppId="+app._id+" Status=success");
        var splitTo = app.submissionNotificationEmailTo.split(",");
        to = splitTo;
      }

      //check if the form response feature is turned off in the admin email notification setting
      var adminFormData="";
      if(app.submissionNotificationShowResponse == true || app.submissionNotificationShowResponse == undefined){
        tempAdminFormData = messages.emailSubmissionNotification.Header + formData;
        // decode line breaks
        adminFormData = (tempAdminFormData.replace(/\r\n|\n|\r/gm, '<br />'));
      }

      //check if there is a custom message that needs to be prepended to the message
      var adminMessage="";
      if(app.submissionNotificationMessage){
        adminMessage = app.submissionNotificationMessage + '<br><br>';
      }

      //construct the admin url to share
      var adminMsgAndUrl = "";
      if(app.submissionNotificationShowLink == true || app.submissionNotificationShowLink == undefined)
      {
        adminMsgAndUrl = messages.emailSubmissionNotification.message+ protocol+ applicationBase + 'admin/'+ sub.appId +'<br><br>';
      }

      //send SES email
      var sesMessage = {
          Subject: {
            Data: subject
          },
          Body: {
            Html: {
                 Data: adminMessage
                  + adminMsgAndUrl
                  + adminFormData
                  + messages.emailSubmissionNotification.reasonForEmail
                  + messages.emailContactInfo
            }
          }
        }
      var replyTo = [];
      for (var i = 0; i < app.replyTo.length; i++ ){
        // console.log("Action='new submission' eachReplyTo=" + app.replyTo[i])
        if(sub.formData[app.replyTo[i]] && sub.formData[app.replyTo[i]] != ""){
          replyTo.push(sub.formData[app.replyTo[i]])
        }
      }
      if(replyTo.length == 0){
        replyTo = null;
      }
      // console.log("Action='new submission' app.replyto=" + app.replyTo);
      // console.log("Action='new submission' ReplyTo=" + replyTo);
      console.log('sesMessage', sesMessage.Body.Html.Data);
      sendSESEmail(messages.fromEmail, to, sesMessage, replyTo);

    }});//end user findone
  }else{
        //if app.emailNotifications is false, don't send an email just continue.
        // console.log("Action='new submission' AppId="+app._id+" Status=success");
      }
      //Check if any app form fields have end user notification on

      var euSubjLine = (endUserSubjectLine.length == 0)? messages.endUserNotification.subject: endUserSubjectLine;
      var euMessage = (endUserMessage.length == 0)? "": endUserMessage;
      if(endUserSubjectLine.length == 0) endUserSubjectLine = messages.endUserNotification.subject;
      if(endUserMessage.length == 0) endUserMessage = "";

      //if app.submissionEdit (admin opted for editable responses) is true
      var editableSubMessage = "";
      if (app.submissionEdit && sub.isDraft){
        var protocol = (applicationBase == '//localhost:3000/' || applicationBase == '//wp-sub.wpprivate.com/')?'http:':'https:';
        var linkTo = protocol + applicationBase;
        editableSubMessage = "You can edit your response here: "+linkTo+"edit/"+sub.appId+"/"+sub._id+"/"+sub.editToken+"<br><br>";
        euSubjLine = app.submissionEditSubjectLine;
        euMessage = (app.submissionEditMessage)?app.submissionEditMessage:"";
        messages.endUserNotification.message="";
      }

      //if there are end user emails to be notified, send SeS email
      if((endUserEmail.length > 0 && (sub.submitted || sub.isDraft) && !app.approvalNotification) || (app.approvalNotification && !sub.approved)){
        console.log("sending end user notification" + sub)
        ses.sendEmail( {
           Source: messages.fromEmail,
           Destination: { ToAddresses: endUserEmail },
           Message: {
               Subject: {
                  Data: euSubjLine
               },
               Body: {
                   Html: {
                       Data: euMessage+"<br><br>"+messages.endUserNotification.message
            + '<h2>"'+app.appName+'"</h2><br><br>'
            + "Your response(s): <br><br>"
            + formData + "<br><br>"
            + editableSubMessage
            + messages.endUserNotification.reasonForEmail + "<br>"
            + messages.emailContactInfo
                   }
                }
           }
        }
        , function(err, data) {
            //email notification sent succesfully. Don't hold up response for this.
            // console.log("end user notification sent: ", err)
         }); //end ses.sendEmail
      }

      //If approval notifications are on
      if(approvalNotificationEmail.length > 0 && sub.approved && app.approvalNotification){
        console.log("sending approval notification")
        ses.sendEmail( {
           Source: messages.fromEmail,
           Destination: { ToAddresses: approvalNotificationEmail },
           Message: {
               Subject: {
                  Data: app.approvalNotificationSubjectLine
               },
               Body: {
                   Html: {
                       Data: '<h2>"'+app.appName+'"</h2><br><br>'

            +app.approvalNotificationMessage+"<br><br>"
            + messages.endUserNotification.reasonForEmail + "<br>"
            + messages.emailContactInfo
                   }
                }
           }
        }
        , function(err, data) {
            //email notification sent succesfully. Don't hold up response for this.
            console.log("approval notification sent: ", err)
         }); //end ses.sendEmail
      }

    }//end of else (else if app found...)
}); //end of app.find one
}

//Cron jobs...

//Description
//  flag forms as innactive if past activeEndDate
exports.checkAppStatus = function(App){
    var date = new Date();
    date.setDate(date.getDate());
    var isoToday = date.toISOString();

    App.find({active:true, activeEndDate:{$lte:isoToday}}, function(error, apps) {
      if(apps.length == 0){
        // console.log("Action='make forms inactive' Status='no forms'");
      }
      else{
        for(index in apps){
          apps[index].active = false;
          // console.log("Action='make form inactive' Status=success");
          apps[index].save();
        }
      }
    });

    App.find({active:false, activeStartDate:{$gte:isoToday}}, function(error, apps) {
      if(apps.length == 0){
        // console.log("Action='make forms active' Status='no forms'");
      }
      else{
        for(index in apps){
          apps[index].active = true;
          // console.log("Action='make form active' Status=success");
          apps[index].save();
        }
      }
    });

    //if it is active and has gone past the end date, make the form inactive
};

//Description:
//  deletes submissions that are not submitted and are older than 1 day
//Takes:
//  Sub: mongoose sub model
// exports.deleteExpired = function(Sub) {
//     var date = new Date();
//     date.setDate(date.getDate()-1);
//     var isoYesterday = date.toISOString()
//     Sub.find({ $or: [{$and: [{createdDate: {$lte: isoYesterday}},{submitted: false}]},
//       {expirationDate: {$lte: new Date()}}]}, function(error,submissions){
//       if(!submissions || submissions.length == 0){
//         // console.log("Action='check expired submissions' Status=none");
//       } else{
//         for (index in submissions) {
//           submissions[index].remove(function(err, submission){
//             if(error){
//               // console.log("Action='check expired submissions' Status=failure Message='"+error+"'");
//             } else if (err){
//               // console.log("Action='check expired submissions' Status=failure Message='"+err+"'");
//             } else {
//               // console.log("Action='check expired submissions' Status=success");
//             }
//           });
//         }
//       }
//     });

// };

//Description:
//  called by cron job nightly.
//  Finds accounts that have been innactive for > 6 months and notifies oldest user that account will expire
//  If account has been innactive for 7 months and user has been notified, account and users are removed from the database
//Takes:
//  Account: account mongoose model
//  User: user mongoose model
//  ses: amazon simple email service
//  messages: contents of messages.js
//  applicationBase: current application base as set by node_env variable at run time
//Returns:
//  nothing
exports.expireInnactiveAccounts = function(Account, User, sendSESEmail, messages, applicationBase) {
  // console.log("Action='Start Job: Expire innactive accounts'")

  //alert accounts innactive for more than 180 days
  var alertDate = new Date();
  var protocol = (applicationBase == '//localhost:3000/' || applicationBase == '//wp-sub.wpprivate.com/')?'http:':'https:'
  //get 180 days ago
  //free people only, also send to sub team
  //add delete account button
  alertDate.setDate(alertDate.getDate()-180);
  var isoAccountAlertTime = alertDate.toISOString();
  Account.find({lastActivity: {$lte: isoAccountAlertTime}, type: "Free"}, function(error, accounts){
    if(!accounts || accounts.length == 0){
      // console.log("Action='check innactive accounts' Message='No users need to be notified of innactivity'")
    } else{
      var userToAlert = null;

      for(index in accounts) {
          //find the earliest user on this account
          var aggregationPipeline = [
            {$match: {'account.acctId':accounts[index]._id}},
            {$sort: {creationDate: -1}},
            {$limit: 1}];
          User.aggregate({$match: {'account.acctId':accounts[index]._id.toString()}},
            {$sort: {creationDate: -1}},
            {$limit: 1}, function(err, agg){
            if(!agg || !agg[0]){
              // console.log("Action='check innactive accounts' Status=Error Message='No users found for account " + accounts[index]._id + ". Account will be deleted'")
            } else if(agg[0].userNotifiedOfInnactivity){
              // console.log("Action='check innactive accounts' Message='" + agg[0].emailAddress + " has already been notified that account " + accounts[index]._id + " will be expired'")
            } else{
              // console.log("user notified? " + agg[0].userNotifiedOfInnactivity)
              //send an email to the earliest user for this account, alerting them of innactivity:
              userToAlert=[agg[0].emailAddress];

              //send SES email
              var sesMessage = {
                Subject: {
                  Data: messages.emailExpirationNotification.subject },
                Body: {
                  Html: {
                   Data: messages.emailExpirationNotification.message1
                    +protocol+ applicationBase + 'login<br><br>'
                    +messages.emailExpirationNotification.message2
                    + messages.emailExpirationNotification.reasonForEmail
                    + messages.emailContactInfo }}}

              sendSESEmail(messages.fromEmail, userToAlert, sesMessage);

            }
          })//end user aggregate
      }
    }
  })//end account.find

  //expire accounts innactive for more than 210 days
  var expireDate = new Date();
  //get 210 days ago
  expireDate.setDate(expireDate.getDate()-210);
  var isoAccountExpirationTime = expireDate.toISOString()
  //find accounts that have been innactive for 210 days (lastActivity is updated whenever a user from this account visits /profile or /forms)
  Account.find({lastActivity: {$lte: isoAccountExpirationTime}, type: "Free"}, function(error, accounts){
    if(!accounts || accounts.length == 0){
      // console.log("Action='check expired accounts' Status=none Message='No Accounts need to be expired'")
    } else{
      for(index in accounts) {
        //double check that no users on this account have logged in in the past 210 days
        User.find({"account.acctId":accounts[index]._id, lastActivity: {$gte: isoAccountExpirationTime}}, function(err, users){
          if(err){
            // console.log("Action='check expired accounts' Status=Failure Message=" + err);
          } else if(users && users.length > 0){
            // console.log("Action='check expired accounts' Message=There are still active users for account "+ accounts[index]._id);
          } else{
            //if there are no active users on this account, go ahead and remove the account.
            accounts[index].remove(function(err, account){
              if(err){
                  // console.log("Action='check expired accounts' Status=failure Message='"+error+"'");
              } else{
                  User.find({"account.acctId":accounts[index]._id}).remove(function(err){
                    if(err){
                      // console.log("Action='check expired accounts' Status=error Message='" + err + "'");
                    } else{
                       // console.log("Action='check expired accounts' Status=success Message='Account expired " + accounts[index]._id + "'");
                    }
                  })

              }
            })
          }
        })//end user.find
      }//end for each account
    }
  }) //end account.find
}
