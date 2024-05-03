const mongoose = require('mongoose') 

const userSchema = mongoose.Schema({
   name: {
       type: String,
       maxlength: 50
   },
   email: {
       type: String,
       trim: true,
       unique: 1
   },
   oauthId: {
       type: String,
       trim: true,
       unique: 1
   },
   oauthAccessToken: {
        type: String,
        trim: true,
        unique: 1
   }
}, {versionKey: false});

const User = mongoose.model('User', userSchema); // userSchema를 model로 만들어준다.

module.exports = { User };

