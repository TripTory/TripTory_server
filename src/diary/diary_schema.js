const mongoose = require('mongoose');

const diarySchema = mongoose.Schema({
    title: {
        type: String,
        maxlength: 100
    },
    content: {
        type: String,
        maxlength: 2000
    },
    date: {
        type: Date,
        required: true
    },
    img: {
        type: [
            {
                tag: [String],
            }
        ]
    },
    travel: {
        type: mongoose.Schema.ObjectId,
        ref: 'Travel'
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    userName: {
        type: String,
        required: true
    }
}, { versionKey: false });

const Diary = mongoose.model('Diary', diarySchema);

module.exports = { Diary };
