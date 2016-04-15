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



// TWP SSO Module Routes //
app.post('/login-wp', application.passportAuthWP(passport, { failureRedirect: '/', failureFlash: true }), function (req, res) {
  res.redirect('/admin');
  req.session.user = req.session.passport.user;
  console.log("successfully logged in:"+req.session.user);
});
app.get('/login-wp', application.passportAuthWP('saml', { failureRedirect: '/', failureFlash: true }), function (req, res) {
  res.redirect('/');
});
