var Mongoose = require('mongoose');
exports.FormSchema = new Mongoose.Schema({
        accountId : { type : String, required : false},
        shared: {type: Boolean, required: false},
        appName: { type : String, required : false},
        appDescription: { type : String, required : false},
        appUrl: { type : String, required : false},
        customerId: { type: String, required: false },
        ownerName: { type: String, required: false },
        callToAction: { type: String, required: false, default: 'Submit' },
        confirmation: { type: String, required: false, default: 'Thanks! Your response has been recorded.' },
        inactiveMessage: { type: String, required: false, default: 'This form is currently not accepting submissions.' },        
        activeEndDate:{ type : Date, required : false },
        activeStartDate:{ type : Date, required : false },
        platformTitle: { type: String, required: false, default: '' },
        submissionNotifications : {type: Boolean, default: false },
        submissionNotificationSubjectLine : { type: String, required: false },
        submissionNotificationEmailTo : { type: String, required: false },
        submissionNotificationMessage : { type: String, required: false },
        submissionNotificationShowResponse : { type: Boolean, required: false },
        submissionNotificationShowLink:{type:Boolean, required:false},
        socialTitle: { type: String, required: false },
        socialDescription:  { type: String, required: false },
        socialShareButtons: {type: Boolean, default: true },
        autoApproved : {type: Boolean, default: false },
        formTypeOnPage : { type: String, required: false },
        active : {type: Boolean, default: true },
        importRequired : {type: Boolean, required: false },
        importCsv : { type: String, required : false },
        importSource : { type: String, required : false },
        createdDate : { type : Date, required : true },
        expiration : { type: String, required : false },
        isDraft : {type: Boolean, required: false},
        draftLastSaved: {type:Date, required: false},
        draftLastSavedUser: {type:String, required: false},
        lastSavedUserId:{type:String, required:false},
        logoUploadId:{type:String, required:false},
        logoURL:{type:String, required: false},
        policyURL:{type:String, required: false},
        tosURL:{type:String, required: false},
        defaultImgFieldExt:{type:String, required:false},
        tinyUrl:{type:String, required: false},
        requireAll:{type: Boolean, default: false},
        submissionLimit:{type: Boolean, default: false},
        submissionLimitAmount:{type: Number, required:false},
        exportToMethode:{type: Boolean, default: false},
        submissionEdit:{type: Boolean, default: false},
        submissionEditSubjectLine : { type : String, default : "Your draft has been saved", required: false },
        submissionEditMessage:{type: String, required:false},
        endUserNotification : { type: Boolean, required : false },
        endUserNotificationEmail:[],
        endUserNotificationSubjectLine : { type : String, default : "Thank you for your submission!", required: false },
        endUserNotificationMessage:{type: String, required:false},
        approvalNotification : { type: Boolean, required : false },
        approvalNotificationEmail:[],
        approvalNotificationSubjectLine : { type : String, default : "Thank you your submission has been approved!", required: false },
        approvalNotificationMessage:{type: String, required:false},
        messageNextToDraftBtn:{type:String, required:false},
        hasCaptcha:{type:Boolean, default:false},
        exportToMethode:{type: Boolean, default: false},
            categories:[{
                categoryId:{type: String, required : false },
                categoryName:{type: String, required : false }
            }],
            appFormFields: [{
                fieldName : { type : String, required : false },
                importName : { type : String, required : false },
                uniqueId : { type : String, required : false },
                fieldType : { type : String, required : false },
                readable : { type : String, required : false },
                mediaSetId : { type : String, required : false },
                mediaSetType : { type : String, required : false },
                fieldTypeOptions : { type : String, required : false },
                isConditional : { type : Boolean },
                fieldTypeOptionsArray:[],
                description : { type : String, required : false },
                placeholder : { type : String, required : false },
                isMandatory : { type : Boolean, default : false },
                isPublic : { type : Boolean, default : true },
                default : { type : String, required : false },
                sequenceNumber: { type: String, required: false, min: 1 },
                // sequenceNumber: { type: Number, required: false, min: 1 },
                _id : false,
                textareaCharLimit : { type: Number, required : false } ,
                min : { type: Number, required : false } ,
                max : { type: Number, required : false } ,
                minAge : { type: Number, required : false } ,
                endUserNotification : { type: Boolean, required : false },
                endUserNotificationSubjectLine : { type : String, default : "Thank you for your submission!", required: false },
                endUserNotificationMessage:{type: String, required:false},
                hasOtherField:{type:Boolean, required:false}
            }],
            mediaSets: [{
                _id : { type : String, required : false },
                numOfMedia : { type: Number, required : false }, 
                mediaSetName : { type: String, required : false },
                mediaSetType : { type: String, required : false },
                //mediaSetExpiration : { type: String, required : false, default : 18 },
                mediaSetFormFields: [{
                    fieldName : { type : String, required : false },
                    fieldType : { type : String, required : false },
                    fieldTypeOptions : { type : String, required : false },
                    description : { type : String, required : false },
                    placeholder : { type : String, required : false },
                    isMandatory : { type : Boolean, default : false },
                    isPublic : { type : Boolean, default : true },
                    default : { type : String, required : false },
                    uniqueId : { type : String, required : false },
                    textareaCharLimit : { type: Number, required : false } ,
                    _id : false
                }],
            }],
            tags: [
            ],
            replyTo: [],
            savedSearches: []
        }
); 
