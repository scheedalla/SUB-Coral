var Mongoose = require('mongoose');

exports.AccountSchema = new Mongoose.Schema({
			name: {type: String, required : false },
			type: {type: String, required : false },
			status: {type: String, required : false },
			creationDate: { type: Date, default: Date.now },
			lastActivity: {type: Date, required: false},
			specialDomains: [],
			specialDomainRedirectMessage: {type: String, required : false },
			defaultPolicyURL: {type: String, required: false},
			defaultTosURL: {type: String, required: false},
			defaultCategory: [{
				categoryId:{type: String, required : false },
				categoryName:{type: String, required : false }
			}],
			categories:[{
				categoryId:{type: String, required : false },
				categoryName:{type: String, required : false }
			}]
    }
);