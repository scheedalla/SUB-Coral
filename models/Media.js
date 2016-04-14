var Mongoose = require('mongoose');

exports.MediaSchema = new Mongoose.Schema({
			uniqueUploadId: {type: String, required : false },
			applicationId: {type: String, required : false },
			customerId: { type: String, required: false },
			sequenceNumber: { type: Number, required : false }, 
			originalName: { type: String, required: false },
			// expirationDate: { type : Date, required : true },
			mediasetFormData: {},
			crop: {},
			rotation: { type: Number, required : false }
    }
);

// exports.MediaSchema = new Mongoose.Schema({
// 			uniqueUploadId: {type: String, required : false },
// 			submissionId: {type: String, required : false },
// 			appId: {type: String, required : false },
// 			customerId: { type: String, required: false },
//     }
// );