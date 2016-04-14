var Mongoose = require('mongoose');

exports.SettingSchema = new Mongoose.Schema({
			name: {type: String, required : false },
			type: {type: String, required : false },
			settings: {	}
    }
);