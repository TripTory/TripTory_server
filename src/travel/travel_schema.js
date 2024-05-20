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
   invited: {
       type: [mongoose.Schema.Types.ObjectId],
       ref: 'User' // User 모델과 연결
   },
   ivtoken: {
      type: String,
      require: true
   },
   userName: {
      type: String,
      ref: 'User'
   },
   userImg: {
      type: String,
      ref: 'User'
  }

}, { versionKey: false });

const Travel = mongoose.model('Travel', travelSchema);

module.exports = { Travel };
