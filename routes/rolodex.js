//get and post requests
var format;
 
//Rolodex
exports.rolodex = function(Sub) {
  console.log("in rolodex submodule........")
  return function(req, res) {
    if(!req.user){
       res.render('login.ejs', {
        errorMessage : null,
        successMessage : null,
        redirect: null
        // js: res.locals.profilejs
       });
    }else{
        res.render('rolodex.ejs', {
        accountId : req.session.account._id,
        user : req.user,
    });

    
    }
  };
};

//New Rolodex
// Retrieve users/sources based on account ID
//example URL: /{accountId}/rolodex.json
exports.getAccountUsers = function(EndUser) {
  console.log("in rolodex submodule getacctusers........")
  return function(req, res) {
    format = req.params.format;
    var accountId = req.params.accountId;
    //Mongo DB Query
    EndUser.find( {'accountId': accountId}, function(error, users) {
      console.log("Action='get Account Users' AccountId="+req.params.accountId+"");
      if(format == 'json') res.json({ rolodex : users });
      else if (format == 'jsonp') res.jsonp({ rolodex : users });
    });
  }
};