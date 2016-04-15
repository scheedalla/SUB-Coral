
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
app.get('/accountSubs/:acctId', query.getAccountSubs(Sub));
app.get('/users/:accountId', query.getCustomers(User));
app.get('/:emailId/userEmail.:format', query.getUserSubs(Sub));
app.get('/user/:customerId', query.getCustomerInfo(User));
app.get('/:customerId/customer.json', query.getCustomerInfo(User));
app.get('/getConfig', query.getConfig);
app.get('/:appId/subs.:format', passport.authenticate('basic', { session: false }), query.getSubmissionSearch(Sub));
app.get('/internal/:appId/subs.:format', query.getSubmissionSearchInternal(Sub));
app.get('/:appId/:subsStatus/submissions.:format', query.getApprovedSubmissions(Sub));
app.get('/:appId/:subsStatus/submissionsReverse.:format', query.getApprovedSubmissionsReverse(Sub));
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


//API CALLS
app.get('/api/v1/:appId/viewSubs.:format', query.getSubmissionSearchExternal(Sub));
app.get('/api/v1/:appId/tags.:format', query.getSubmissionTags(Sub));
app.get('/api/v1/:appId/subDate.:format', query.getSubmissionDate(Sub));
app.get('/api/v1/:subId/sub.:format', query.getUniqueSubmission(Sub));
