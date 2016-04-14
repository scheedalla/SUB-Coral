var Mongoose = require('mongoose');

exports.EndUserSchema = new Mongoose.Schema({
			accountId: {type: String, required : false},
			//appId placeholder for forms array
			appId: {type: String, required : false},
			userName: {type: String, required : false },
			emailAddress: {type: String, required : false },
			phoneNumber: {type: String, required : false },
			creationDate: { type: Date, default: Date.now },
			activeDate: { type: Date},
			optOut: {type: Boolean, required: false},
			forms:[{
                _id:{type: String, required : false }
            }],
			//formData is only a placeholder to collect submission data - it is re-written
			formData:{},
			cookies:{}
    }
);




// exports.EndUserSchema = new Mongoose.Schema({
// 			accountId: {type: String, required : false},
// 			userName: {type: String, required : false },
// 			emailAddress: {type: String, required : false },
// 			creationDate: { type: Date, default: Date.now },
// 			activeDate: { type: Date},
// 			optOut: {type: Boolean, required: false},
// 			forms:{},
// 			formData:{},
// 			cookies:{}
//     }
// );