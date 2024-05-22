const mongoose = require('mongoose');

const travelSchema = mongoose.Schema({
    title: {
       type: String,
       maxlength: 100
    },
    startdate: {
       type: Date,
       required: true
    },
    enddate: {
       type: Date,
       required: true
    },
    location: {
      latitude: Number,
      longitude: Number,
      region: String
   },
   travelimg: {
      type: String
   },
   invited: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: {type: String, ref: 'User' }
   }],
   ivtoken: {
      type: String,
      require: true
   }
}, { versionKey: false });

const Travel = mongoose.model('Travel', travelSchema);

module.exports = { Travel };
