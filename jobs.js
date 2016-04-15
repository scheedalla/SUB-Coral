
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
