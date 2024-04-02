
// travel.js

const mongoose = require('mongoose');

const diarySchema = mongoose.Schema({
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
    location: Array(
        {langitube: Double},
        {latitude: Double,}
    ),
    content: {
       type: String,
       maxlength: 5000 // 예시로 5000자로 제한
    },
    invited: {
       type: [mongoose.Schema.Types.ObjectId],
       ref: 'User' // User 모델과 연결
    },
}, { versionKey: false });

export const Travel = mongoose.model('Travel', diarySchema);

module.exports = { Travel };
