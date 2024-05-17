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
                imgpath: String,
                tag: [String],
            }
        ]
    },
    travel: {
        type: mongoose.Schema.ObjectId,
        ref: 'Travel'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { versionKey: false });

const Diary = mongoose.model('Diary', diarySchema);

module.exports = { Diary };
