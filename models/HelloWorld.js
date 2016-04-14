var Mongoose = require('mongoose');

exports.HelloWorld = new Mongoose.Schema({
			name: {type: String, required : false },
			type: {type: String, required : false },
			creationDate: { type: Date, default: Date.now },
			categories:[{
				id:{type: String, required : false },
				name:{type: String, required : false }
			}]
    }
);