//query.js handles all requests for data from the database

//Global variable: stores json vs jsonp
//some methode users need jsonp so we want to let them choose that in their api call to sub
var format;

//Description: Check whether a username is already taken in the database
//TriggeredBy: Post to /check/username
//Returns: error or success message
exports.checkUsername = function(User){
  return function(req, res){
    var username = req.body.username.toLowerCase();

    // check if username contains non-url-safe characters
  if (username !== encodeURIComponent(username)) {
    res.json(403, {
      invalidChars: true
    });
    return;
  }

  var usernameTaken = false;
  User.find({userName:username}, function(err, doc){
    if(err || !doc){
      res.json({error: err});
    }
    else{
      if(doc.length > 0){
        for (var i=0;i<doc.length;i++){
          if(doc[i].userName == username){
            usernameTaken = true;
            break;
          }
        }
      }

      if(usernameTaken){
        res.json(403,{
          isTaken:true
        })
        return;
      }

      res.send(200);
    }
  });


  };
};

//Description: get an app from the database
//TriggeredBy: GET request to /{appId}/app.json
//Returns: an application document from mongodb
exports.getApp = function(Forms) {
  return function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    format = req.params.format;
    Forms.findOne({ _id : req.params.id }, function(error, applications) {
      if(error){
        res.json({error:error});
        console.log("Action='get app' AppId="+req.params.id+" Status=failure Message='"+error+"'");
      }
      else{
        console.log("Action='get app' AppId="+req.params.id+" Status=success");
        if(format == 'json') res.json({ applicationInfo : applications });
        else if (format == 'jsonp') res.jsonp({ applicationInfo : applications });
      }
    });
  }
};

//Description: get mediasets from an application in the database
//TriggeredBy: GET request to /:id/mediasets/app.:format
//Returns: The mediasets array from an application document in mongodb
exports.getMediasets = function(Forms) {
  return function(req, res) {
    format = req.params.format;
    var searchProj;

    if(req.query.msId){
      searchProj ={
      mediaSets:{
        $elemMatch:{_id:req.query.msId}
      }
    };

    }
    else{
      searchProj ="";
    }

    Forms.find({_id: req.params.id}, searchProj, function(error, applications) {
      if(error){
        console.log("Action='get mediasets' AppId="+req.params.id+" Status=failure Message='"+error+"'");
      }
      else{
      console.log("Action='get mediasets' AppId="+req.params.id+" Status=success");
      if(format == 'json') res.json(applications[0].mediaSets);
      else if (format == 'jsonp') res.jsonp(applications[0].mediaSets);
    }
    });
  }
};

//Description: Get all apps for a user
//TriggeredBy: GET request to /{customerId}/customerForms.json
//Returns: an array of application documents witht this customerid from mognodb
exports.getCustomerForms = function(Forms) {
  return function(req, res) {
    Forms.find({ customerId : req.params.customerId }, function(error, applications) {
      if(error){
        console.log("Action='get customer apps' CustomerId="+req.params.customerId+" Status=failure Message='"+error+"'");
      }
      else{
      console.log("Action='get customer apps' CustomerId="+req.params.customerId+" Status=success");
      res.json({ applicationInfo : applications });
    }
    });
  }
};

//Description: Gett all apps for an account
//TriggeredBy: GET request to /{accountId}/accountForms.json
//Returns: array of application documents from mongodb
exports.getAccountForms = function(Forms, User, Sub) {
  return function(req, res) {
    format = req.params.format;
    var searchOpts = {
      mustMatch:  {
        accountId: req.params.accountId
      },
      sort: [{"createdDate": "desc"}],
      pageSize: 1000,
      page: 1
    };
    Forms.find({accountId: req.params.accountId}, function(error, results) {
    // Forms.find({accountId: req.params.accountId}, function(error, results){
      if(error){
        console.log("Action='get account apps' AccountId="+req.params.accountId+" Status=failure Message='"+error+"'");
      }
      else{
        // applications = []
        // for (index in results.hits){
        //   applications.push(results.hits[index]._source);
        // }
        applications = results;
        //get array of customerIds for search and build object with customerID keys for the results to go in
        var customerIds = [];
        var customerNameMap = {};
        for (index in applications) {
          if(customerNameMap[applications[index].customerId] != "" && applications[index].customerId){
            customerNameMap[applications[index].customerId] = "";
            customerIds.push(applications[index].customerId);
          }
        }

      //search for array in User model...
      User.search({mustMatch:{_id: customerIds}}, function(err, results){
        if(err){
          console.log("Action='get account apps' AccountId="+req.params.accountId+" Status=failure Message='error getting users for these apps: "+err+"'");
          res.json({ acctAppsInfo : applications });
        } else{
          for(index in results.hits){
            customerNameMap[results.hits[index]._source._id] = results.hits[index]._source.userName
          }

          var accountId = req.params.accountId;
          var aggOptions = {mustMatch: {"accountId": accountId, "submitted" : true}, groupBy: "appId"}
          Sub.aggregateCount(aggOptions, function(err, results){
            var subCounts = {};
            var buckets = {};
            if(results.aggregation){
              buckets = results.aggregation.ElmongooseAggWrapper.ElmongooseAgg.buckets;
            }
            for(var key in buckets){
              subCounts[buckets[key].key] = buckets[key].doc_count;
            }
            for(var key in applications){
              applications[key].subCount = subCounts[applications[key]._id];
            }
            if(err){
              res.json({Error: err});
            } else{
              console.log("Action='get account apps' AccountId="+req.params.accountId+" Status=success");
              res.json({ acctAppsInfo : applications,
                                              customerinfoMap : customerNameMap });
            }
          });


        }
      });
    }
    });
  }
};

//Description: get count of submissions for each app owned by this account
//TriggeredBy: GET request to /accountSubs/
//Returns: array of application ids and a count of submissions for each, aggregated in elastic search

exports.getAccountSubs = function(Sub) {
  return function(req, res) {
    var accountId = req.params.acctId;
    var aggOptions = {mustMatch: {"accountId": accountId, "submitted" : true}, groupBy: "appId"}
    Sub.aggregateCount(aggOptions, function(err, results){
      var subCounts = {};
      if(results != null){
        var buckets = {};
          if(results.aggregation){
            buckets = results.aggregation.ElmongooseAggWrapper.ElmongooseAgg.buckets;
          }
        for(var key in buckets){
          subCounts[buckets[key].key] = buckets[key].doc_count;
        }
        if(err){
          res.json({Error: err});
        } else{
          res.json({Results : subCounts})
        }
      } else{
         console.log("Action='ElasticSearch Sync Error or Query Error' Status=failure Message='"+error+"'");
      }

    });

  }
}

//TODO: check if this is used anymore
//Description: get all submissions for a customer
//TriggeredBy: GET request to /{customerId}/customerSubs.json
//Returns: array submission documents from mongodb
exports.getCustomerSubs = function(Sub) {
  return function(req, res) {
    if(!req.user || req.user._id != req.params.customerId){
      res.json({error: "You do not have permission to view submissions for this customer."});
    }
    format = req.params.format;
    Sub.find({ customerId : req.params.customerId }, function(error, submissions) {
      if(error){
        console.log("Action='get customer submissions' CustomerId="+req.params.customerId+" Status=failure Message='"+error+"'");
      }
      else{
        console.log("Action='get customer submissions' CustomerId="+req.params.customerId+" Status=success");
      if(format == 'json') res.json({ Submissions : submissions });
      else if (format == 'jsonp') res.jsonp({ Submissions : submissions });
    }
    }).sort('-date');
  }
};

//Description: Get all customers for an account
//TriggeredBy: GET request to /customers/{accountId}
//Returns: array of customer documents from mongodb
exports.getCustomers = function(User) {
  return function(req, res) {

    User.find({ "account.acctId" : req.params.accountId }, function(error, customers) {
      if(error){
        console.log("Action='get customers' AccountId="+req.params.accountId+" Status=failure Message='"+error+"'");
      }
      else{
        console.log("Action='get customers' AccountId="+req.params.accountId+" Status=success");
      res.json({ customers : customers });
    }
    });
  }
};

//Description: Get a single user (from the customers collection)
//TriggeredBy: GET request to /user/:customerId
//Returns: a single user document from mongodb
exports.getCustomerInfo = function(User) {
  return function(req, res) {
    // format = req.params.format;
    User.find({ _id : req.params.customerId }, function(error, customer) {
      if(error){
        console.log("Action='get customer info' CustomerId="+req.params.customerId+" Status=failure Message='"+error+"'");
      }
      else{
      console.log("Action='get customer info' CustomerId="+req.params.customerId+" Status=success");
      res.json({ customerInfo : customer });
    }
    });
  }
};

//TODO: Where is this used?
exports.getConfig = function(req, res) {
   res.sendfile('config.json');
};

//Description: search api for multiple apps.
//TriggeredBy: GET request to /multiAppViewSubs
//Returns: array of submission documents from mongodb
exports.customElasticSubmissionSearch = function(Sub) {
  return function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    var propName, searchField, searchValue, searchQuery = {};
    var message = null;

    //check the format of the req
    format = req.body.format;

    //build the search query
    searchQuery=req.body.searchQuery

    //query mongodb
    Sub.search(searchQuery,function(error, results) {

      if(!results.hits || !results.total){
        if(format == 'json') res.json({ Submissions : null });
        else if(format == 'jsonp') res.jsonp({ Submissions : null });
      }

      else{
        var submissions = [];
        console.log(results.hits)
        for (index in results.hits){
          results.hits[index]._source.formData = results.hits[index]._source.formData[results.hits[index]._source.appId];
          submissions.push(results.hits[index]._source);
        }
        if(format == 'json') res.json({ Submissions : submissions});
        else if(format == 'jsonp') res.jsonp({ Submissions : submissions});
      }
    });
  }
};


//TODO: Confirm with Sruti that I got this description right
//Description: search api.
//TriggeredBy: GET request to /{appId}/subOptions.json?tags=...etc.
//Returns: array of submission documents from mongodb
exports.getSubmissionSearch = function(Sub) {
  return function(req, res) {
    var propName, searchField, searchValue, searchQuery = {};
    var message = null;

    //check the format of the req
    format = req.params.format;

    //build the search query
    searchQuery['appId']=req.params.appId;
    searchQuery['submitted']=true;

    for (propName in req.query) {
      if (req.query.hasOwnProperty(propName)) {
        if(propName != 'callback') {
          searchField = 'formData.'+propName;
          searchValue = req.query[propName];
          searchQuery[searchField] = searchValue;
        }
      }
    }


    //query mongodb
    Sub.find(searchQuery,function(error, submission) {
      if(!submission[0]){
        if(format == 'json') res.json({ Submissions : null });
        else if(format == 'jsonp') res.jsonp({ Submissions : null });
      }

      if(format == 'json') res.json({ Submissions : submission});
      else if(format == 'jsonp') res.jsonp({ Submissions : submission});

    });
  }
};

//TODO: Confirm with Sruti that I got this description right
//Description: external search api. Cut out all the unnecessary stuff for a get request
//TriggeredBy: GET request to /external/{appId}/subOptions.json?tags=...etc.
//Returns: array of submission documents from mongodb
exports.getSubmissionSearchExternal = function(Sub) {
  return function(req, res) {
    var propName, searchField, searchValue, searchQuery = {};

    //check the format of the req
    format = req.params.format;

    //build the search query
    searchQuery['appId']=req.params.appId;
    searchQuery['submitted']=true;

    for (propName in req.query) {
      if (req.query.hasOwnProperty(propName)) {
        if(propName == 'callback' || propName == '_') {
          //do nothing
        }
          else{
          searchField = 'formData.'+propName;
          searchValue = req.query[propName];
          searchQuery[searchField] = searchValue;
        }
      }
    }




    //query mongodb
    Sub.find(searchQuery, function(error, submission) {
        if(format == 'json') res.json({ Submissions : submission});
        else if(format == 'jsonp') res.jsonp({ Submissions : submission});
    });
  }
};

//
//TODO: Confirm with Sruti that I got this description right
//Description: internal search api. used to display application submissions within SUB
//TriggeredBy: GET request to /internal/{appId}/subOptions.json?tags=...etc.
//Returns: array of submission documents from mongodb
exports.getSubmissionSearchInternal = function(Sub) {
  return function(req, res) {
    var propName, searchField, searchValue, searchQuery, searchOpts = {};
    searchOpts.mustMatch={};
    var message = null;
    var session = req.session;
    if(req.user.session) {
      session = req.user.session;
    }


    //check the format of the req
    format = req.params.format;

    for (propName in req.query) {
      if (req.query.hasOwnProperty(propName)) {
        if(propName != 'callback' && propName!='page'&& propName!='size' && propName!='tags'&& propName!='approved') {
          searchField = 'formData.'+req.params.appId+'.'+propName;
          searchValue = req.query[propName];
          searchOpts.mustMatch[searchField] = searchValue;
        } else if(propName =='tags'){
          searchOpts.mustMatch.tags=req.query[propName];
        } else if(propName == 'approved'){
          searchOpts.mustMatch.approved = req.query[propName];
        }
      }
    }


    searchOpts.mustMatch['appId']=req.params.appId;
    searchOpts.mustMatch['submitted']=true;

    if(req.query.size && req.query.page){
      searchOpts.pageSize = req.query.size;
      searchOpts.page = req.query.page;
    }

    searchOpts.sort = [
      { "createdDate" : "desc" }
    ]
    Sub.search(searchOpts,function(error, results) {
      if(!results || !results.hits || !results.total){
        if(format == 'json') res.json({ Submissions : null });
        else if(format == 'jsonp') res.jsonp({ Submissions : null });
      }

      else{
        var submissions = [];
        console.log(results.hits)
        for (index in results.hits){
          results.hits[index]._source.formData = results.hits[index]._source.formData[req.params.appId];
          submissions.push(results.hits[index]._source);
        }

        console.log(results.total)

        if(format == 'json') res.json({ Submissions : submissions, Total: results.total});
        else if(format == 'jsonp') res.jsonp({ Submissions : submissions, Total: results.total});

      }

    });
  }
};

//Description: Get all applications for an account
//TriggeredBy: GET request to /elasticSearch/:acctId/forms
//Returns: array of applications from elastic search
exports.getFormsElasticSearch = function(Forms){
  return function(req, res) {
    var searchOpts = req.body;
    //build the search query
    if(!searchOpts.mustMatch || !Object.keys(searchOpts.mustMatch).length){
      searchOpts.mustMatch = {};
    }
    searchOpts.mustMatch['accountId']=req.params.acctId;
    Forms.search(searchOpts, function(err, results){
      if(err){
        res.json({Error: err});
      } else{
        res.json({Results : results})
      }
    });
  }
}

//Description: used to get count of approve and unapproved submissions for a form
//TriggeredBy: GET request to /elasticSearch/approvalCount/:appId
//Returns: object w/ approvedCount and unapprovedCount
exports.getApprovalCountElasticSearch = function(Sub) {
  return function(req, res) {
    var searchField, searchValue, searchQuery= {};
    var message = null;
    var session = req.session;
    if(req.user.session) {
      session = req.user.session;
    }

    searchOpts = {
      mustMatch: {
        'submitted': true,
        'appId': req.params.appId,
        'approved': true
      }
    }

  Sub.search(searchOpts, function (err, r1) {
      var totalApproved = r1.total;
      searchOpts.mustMatch['approved']=false;
      Sub.search(searchOpts, function (err, r2) {
        var totalUnapproved = r2.total
        res.json({approvedCount: totalApproved, unapprovedCount: totalUnapproved})
      })
    })
  }
};

//Description: used to display submissions for an application within SUB
//TriggeredBy: GET request to /elasticSearch/:appId/subs.:format
//Returns: array submissions from elastic search
exports.getSubmissionAdvancedElasticSearch = function(Sub) {
  return function(req, res) {
    var propName, searchField, searchValue, searchQuery= {};
    var rangeQuery = {};
    var message = null;
    var session = req.session;
    var searchOpts = req.body;
    if(req.user.session) {
      session = req.user.session;
    }


    //check the format of the req
    format = req.params.format;

    //build the search query
    if(!searchOpts.mustMatch || !Object.keys(searchOpts.mustMatch).length){
      searchOpts.mustMatch = {};
    }
    searchOpts.mustMatch['appId']=req.params.appId;
    searchOpts.mustMatch['submitted']=true;


  Sub.search(searchOpts, function (err, results) {
    submissions = []
    if(!err && results){
      for (index in results.hits){

        results.hits[index]._source.formData = results.hits[index]._source.formData[req.params.appId];
        submissions.push(results.hits[index]._source);
      }

      res.json({ Submissions : submissions, Total: results.total});
    } else {
      res.json({errorMessage : err});
    }

  });

  }
};

//Description: used to display submissions for an application within SUB
//TriggeredBy: GET request to /elasticSearch/:appId/subs.:format
//Returns: array submissions from elastic search
exports.getSubmissionAdvancedElasticSearchExternal = function(Sub) {
  return function(req, res) {
    var propName, searchField, searchValue, searchQuery= {};
    var rangeQuery = {};
    var message = null;
    var searchOpts = req.body;

    //check the format of the req
    format = req.params.format;

    //build the search query
    if(!searchOpts.mustMatch || !Object.keys(searchOpts.mustMatch).length){
      searchOpts.mustMatch = {};
    }
    searchOpts.mustMatch['appId']=req.params.appId;
    searchOpts.mustMatch['submitted']=true;


  Sub.search(searchOpts, function (err, results) {
    submissions = []
    if(!err && results){
      for (index in results.hits){

        results.hits[index]._source.formData = results.hits[index]._source.formData[req.params.appId];
        submissions.push(results.hits[index]._source);
      }

      res.json({ Submissions : submissions});
    } else {
      res.json({errorMessage : err});
    }

  });

  }
};


//Description: api for users who want to query submissions with sepcific tag settings.  Only submissions that are tagged Best and Sunset
//TriggeredBy: GET request to /{appId}/tags.json?tags=best&tags=sunset etc.
//Returns: array of submissions from mongodb
exports.getSubmissionTags = function(Sub) {
  return function(req, res) {

    var searchQuery = {};

    //check the format of the req
    format = req.params.format;

    searchQuery={
      appId:req.params.appId,
      tags:{
        $all:req.query.tags
      }
    };
    console.log(searchQuery);

    //query mongodb
    Sub.find(searchQuery , function(error, submission) {
      if(format == 'json') res.json({ Submissions : submission });
      else if(format == 'jsonp') res.jsonp({ Submissions : submission });
    });
  }
};

//TODO: Why is this called options? Should this be deprecated? It is for a get request, not an options request
//Description: //view for users who want to query submissions by a group of tag settings.  Submissions that are tagged either Best or Sunset.
//TriggeredBy: GET request to /:appId/tagsOptions.:format?tags=...etc.
//Returns: array of submissions from mongodb
exports.getSubmissionTagsOptions = function(Sub) {
  return function(req, res) {
    var searchQuery = {};

    //check the format of the req
    format = req.params.format;
    var tagVals = req.query.tags;
    if(typeof tagVals == "string"){
      tagVals=[];
      tagVals.push(req.query.tags);
    }

    //build the search query
    searchQuery={
      appId:req.params.appId,
      tags:{
        $in:tagVals
      }
    };
    console.log(searchQuery);



    //query mongodb
    Sub.find(searchQuery, function(error, submission) {
      if(format == 'json') res.json({ Submissions : submission });
      else if(format == 'jsonp') res.jsonp({ Submissions : submission });
    });
  }
};

//Description: gets results from elastic search based on date range
//TriggeredBy: GET request to /{appId}/subDate.json?min={mmddyyyy}&max={mmddyyyy}
//Returns: array of submissions from elastic search
exports.getSubmissionDateElasticSearch = function(Sub) {
  return function(req, res) {
    var searchValue, searchQuery = {};

    //check the format of the req
    format = req.params.format;

    //build the match query
    var searchQuery = {
      submitted: true,
      appId:req.params.appId
    };


    //build the range query
    var min = req.query.min;
    var max = req.query.max;
    var rangeQuery = {"createdDate" : {"gte": min, "lte": max}};

    //query mongodb
    Sub.search({ where: searchQuery, range: rangeQuery, fuzziness:"AUTO" }, function (err, results) {
      if(err || !results){
        if(format == 'json') res.json({ errorMessage : err });
        else if(format == 'jsonp') res.jsonp({ errorMessage : err });
      } else{
        submissions = [];
        for (index in results.hits){
          results.hits[index]._source.formData = results.hits[index]._source.formData[req.params.appId];
          submissions.push(results.hits[index]._source);
        }
        if(format == 'json') res.json({ Submissions : submissions,Total: results.total });
        else if(format == 'jsonp') res.jsonp({ Submissions : submissions,Total: results.total });
      }
    });
  }
};


//Description: used to display submissions for an application within SUB
//TriggeredBy: GET request to /elasticSearch/:appId/subs.:format
//Returns: array submissions from elastic search
exports.getSubmissionAdvancedDateElasticSearchExternal = function(Sub) {
  return function(req, res) {

    var propName, searchField, searchValue, searchQuery= {};
    var rangeQuery = {};
    var message = null;
    var session = req.session;
    var searchOpts = req.body;
    
    if(req.user.session) {
      session = req.user.session;
    }

    //build the range query
    var min = req.query.min;
    var max = req.query.max;
    var rangeQuery = {"createdDate" : {"gte": min, "lte": max}};


    //check the format of the req
    format = req.params.format;

    //build the search query
    if(!searchOpts.mustMatch || !Object.keys(searchOpts.mustMatch).length){
      searchOpts.mustMatch = {};
    }
    searchOpts.mustMatch['appId']=req.params.appId;
    searchOpts.mustMatch['submitted']=true;

  Sub.search(searchOpts, function (err, results) {
    submissions = []
    if(!err && results){
      for (index in results.hits){

        results.hits[index]._source.formData = results.hits[index]._source.formData[req.params.appId];
        submissions.push(results.hits[index]._source);
      }

      res.json({ Submissions : submissions, Total: results.total});
    } else {
      res.json({errorMessage : err});
    }

  });

  }
};


//Description: api for users who want to query submissions by date
//TriggeredBy: GET request to  /{appId}/subDate.json?min={mmddyyyy}&max={mmddyyyy}
//Returns: array of submissions from mongodb
exports.getSubmissionDate = function(Sub) {
  return function(req, res) {
    var searchValue, searchQuery = {};

    //check the format of the req
    format = req.params.format;

    //build the search query
    var s = (req.query.min)?req.query.min:"01011915";
    var e = (req.query.max)?req.query.max:"01013015";
    var min = new Date(parseInt(s.substring(4,8)),parseInt(s.substring(0,2))-1,parseInt(s.substring(2,4)));
    var max = new Date(parseInt(e.substring(4,8)),parseInt(e.substring(0,2))-1,parseInt(e.substring(2,4)));



    //query mongodb
    Sub.find({appId: req.params.appId, createdDate: {$gte: min, $lt: max}  }, function(error, submission) {
      if(format == 'json') res.json({ Submissions : submission });
      else if(format == 'jsonp') res.jsonp({ Submissions : submission });
    });
  }
};


//Description: Retrieve users/sources based on account ID
//TriggeredBy: GET request to /{emailId}/userEmail.json
//Returns: array of submissions from mongodb
exports.getUserSubs = function(Sub) {
  return function(req, res) {
    format = req.params.format;
    var emailId = req.params.emailId;
    //Mongo DB Query
    Sub.find({'formData.email_1': emailId}, function(error, submissions) {
      if(format == 'json') res.json({ userSubs : submissions });
      else if (format == 'jsonp') res.jsonp({ userSubs : submissions });
    });
  }
};


//Description: get all approved or unapproved submissions for a given application
//TriggeredBy: GET request to /:appId/:subsStatus/submissions.json?firstname=...etc.
//Returns: array of submissions from mongodb
exports.getApprovedSubmissions = function(Sub) {
  return function(req, res) {
    var approved;
    var appId = req.params.appId;
    var subsStatus = req.params.subsStatus;
    format = req.params.format;
    if ( subsStatus == 'approved' ) {
      approved = true;
      } else if ( subsStatus == 'unapproved' ) {
      approved = false;
      }

    var query = Sub.find( { appId: appId, approved: approved} );
    for (var propName in req.query) {
        if (req.query.hasOwnProperty(propName)) {
          if(propName != 'callback') {
            var field = 'formData.'+propName;
            var value = req.query[propName];
            query.where(field).equals(value);
          }
        }
        }

    query.exec(function (err, docs) {
      if (err) return handleError(err);
      if(format == 'json') res.json({ Submissions : docs });
      if(format == 'jsonp')res.jsonp({ Submissions : docs });
    });

    }
};

//Description: get all approved or unapproved submissions for a given application
//TriggeredBy: GET request to /:appId/:subsStatus/submissionsReverse.json?firstname=...etc.
//Returns: array of submissions from mongodb
exports.getApprovedSubmissionsReverse = function(Sub) {
  return function(req, res) {
    var approved;
    var appId = req.params.appId;
    var subsStatus = req.params.subsStatus;
    format = req.params.format;
    if ( subsStatus == 'approved' ) {
      approved = true;
      } else if ( subsStatus == 'unapproved' ) {
      approved = false;
      }

    var query = Sub.find( { appId: appId, approved: approved} );
    query.sort({_id: -1});
    for (var propName in req.query) {
        if (req.query.hasOwnProperty(propName)) {
          if(propName != 'callback') {
            var field = 'formData.'+propName;
            var value = req.query[propName];
            query.where(field).equals(value);
          }
        }
        }

    query.exec(function (err, docs) {
      if (err) return handleError(err);
      if(format == 'json') res.json({ Submissions : docs });
      if(format == 'jsonp')res.jsonp({ Submissions : docs });
    });

    }
};

//Description: get a single submission
//TriggeredBy: GET request to /sub/:subId.:format
//Returns: a submisison from mongodb
exports.getUniqueSubmission = function(Sub){
  return function(req, res) {
    format = req.params.format;

    Sub.findOne({ _id : req.params.subId }, function(error, sub) {
      if(error){
        res.json({error:error});
       console.log("Action='get unique submission' SubId="+req.params.subId+" Status=failure Message="+error);
      }
      else{
        console.log("Action='get unique submission' SubId="+req.params.subId+" Status=Success");
        if(format == 'json') res.json(sub);
        else if (format == 'jsonp') res.jsonp(sub);
      }


    });
  }
};

//Description: get a single mediaset
//TriggeredBy: GET request to /:subId/:msId/mediaset.:format
//Returns: a mediaset from inside of a submission document from mongodb
exports.getUniqueMediaset = function(Sub){
  return function(req, res) {
    format = req.params.format;

    if(req.params.msId){
      searchProj ={
      mediasets:{
        $elemMatch:{mediasetId:req.params.msId}
      }
    };

    }
    else{
      searchProj ="";
    }

    Sub.find({ _id : req.params.subId }, searchProj, function(error, sub) {

      if(format == 'json') res.json(sub);
      else if (format == 'jsonp') res.jsonp(sub);
    });
  }
};

//Description: checks that an email has not already been used for an existing user
//TriggeredBy: POST request to /check/email
//Returns: a success or error message
exports.checkEmail = function(User,Account){
  return function(req, res){
    var email = req.body.email.toLowerCase();
  var emailTaken = false;
  var emailParts = email.split("@");
  var domain = emailParts[1];
  //check if domain is reserved
  Account.findOne({specialDomains:domain}, function(err,account){
    if(err){
      res.json({error: err});
    } else if(account){
      res.json(403,{
        isSpecialDomain:true,
        specialDomain: domain,
        redirectMessage: account.specialDomainRedirectMessage
      })
      return;
    }
      //check if email is already taken
        User.find({emailAddress:email}, function(err, doc){
          if(err || !doc){
            res.json({error: err});
          }
          else{
            if(doc.length > 0){
              for (var i=0;i<doc.length;i++){
                if(doc[i].emailAddress == email){
                  emailTaken = true;
                  break;
                }
              }
            }

            if(emailTaken){
              res.json(403,{
                isTaken:true
              })
              return;
            }

            res.send(200);
          }
        });
  })



  };
};

//Description: get a single account
//TriggeredBy: GET request to /account/:accountId
//Returns: an account document from mongodb
exports.getAccountInfo = function(Account, Forms) {
  return function(req, res) {


    Account.findOne({ _id : req.params.accountId }, function(error, account) {
      if(error) {
          res.json({error: error});
        } else {
           res.json({ accountInfo : account});
         }



    });
  }
};
