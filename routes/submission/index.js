
/**
 * Module dependencies
 */

import { Router } from 'express';
import submission from './controllers';

// Create Router
const app = Router();

/**
 * Routes
 */

app.post('/submission', submission.submitForm(false));
app.post('/createEmptySubmission', submission.submitForm(true));
app.post('/updateSub', submission.updateSubmission);
app.post('/updateSubAndMed', submission.updateSubmissionAndMediaset);

app.post('/updateSubTags', submission.updateSubmissionTags);
app.post('/bulkRemoveSubTags', submission.bulkRemoveSubTags);
app.post('/bulkAddSubTags', submission.bulkAddSubTags);
app.post('/bulkDeleteSubs', submission.bulkDeleteSubs);
app.post('/updateApp', submission.updateApplication);
app.post('/updateUserStatus', submission.updateUserStatus);
app.post('/updateUserLastActiveDate', submission.updateUserActiveDate);
app.post('/updateAccount', submission.updateAccount);
app.delete('/categories/:catId', submission.removeCategoryFromApps);
app.post('/updateUser', submission.updateUser);
app.post('/updateEndUser', submission.updateEndUser);

//Client Side Logging
app.post('/clientDebuglogger', submission.clientDebuglogger);
app.post('/clientErrorlogger', submission.clientErrorlogger);

app.delete('/sub/:id', submission.deleteSub; //delete a single submission
app.delete('/form/:id', submission.deleteForm; //delete a single form
app.delete('/subs/:id', submission.deleteAllSubs; //delete subs based on form id
app.post('/updateApproval', submission.updateApproval);
app.post('/updatePupSub', submission.updatePupSubmission);
app.post('/:id/changePass', submission.changePass);
app.post('/form', submission.addNewKVP);

// Expose Router
export default app;
