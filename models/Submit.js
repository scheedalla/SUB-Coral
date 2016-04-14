var Mongoose = require('mongoose');
var Schema = Mongoose.Schema,
    // elmongo = require('elmongo'), 
    ObjectId = Schema.ObjectId;


exports.SubmissionSchema = new Mongoose.Schema({
            appId: {type: String, required : false, elastic : true },
            accountId: {type: String, required : false, elastic : true },
            editToken: {type: String, required : false, elastic : true },
            transfered: {type: Boolean, required : false, elastic : true },
            customerId: { type: String, required: false, elastic : true },
            approved : {type: Boolean, default: true, elastic : true },
            submitted : {type: Boolean, default: false, elastic : true },
            createdDate: { type: Date, default: new Date(), elastic : true },
            paramObject : { type: Mongoose.Schema.Types.Mixed, elastic : 'array'},
            formData: { type: Mongoose.Schema.Types.Mixed, elastic : 'array'},
            mediasets: { type: Array, elastic : 'array'},
            isDraft: {type: Boolean, required : false, elastic : true },
            approvalNotification: {type: Boolean, required : false, elastic : true },
            tags: [],
            cookies:{}
    }
);

//exports.SubmissionSchema.plugin(elmongo, { host : '10.128.130.37', port: 9200, prefix: 'qa', grouper:'appId', flatten:'formData'});


// exports.SubmissionSchema.plugin(elmongo)

// exports.SubmissionSchema.sync(function (err, numSynced) {
//   // all cats are now searchable in elasticsearch
//   console.log('number of cats synced:', numSynced)
// })

// var Cat = new Schema({
//     name: String
// })

// Cat.plugin(elmongo)

// exports.Cat = mongoose.model('Cat', Cat)
// exports.CatSchema = Cat

// Cat.sync(function (err, numSynced) {
//   // all cats are now searchable in elasticsearch
//   console.log('number of cats synced:', numSynced)
// })
