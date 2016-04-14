var Mongoose = require('mongoose');

exports.UserSchema = new Mongoose.Schema({
			customerName: {type: String, required : false },
			userName: {type: String, required : false },
			emailAddress: {type: String, required : false },
			creationDate: { type: Date, default: Date.now },
			activeDate: { type: Date},
			expirationLength: {type: String, required : false, default : '18'},
			password: {type: String, required : false },
			resetPasswordToken: {type: String, required : false},
			resetPasswordExpires: {type: String, required : false },
			emailConfirmationToken: {type: String, required : false },
			employeeID:{type: String, required : false },
			isLDAP: {type: Boolean, required: false, default: false },
			account: {
				acctId: {type: String, required : false},
				role: {type: String, required : false},
				status: {type: String, required : false, default : 'active' }
			},
			defaultCategory:{},
			session: {}
    }
);