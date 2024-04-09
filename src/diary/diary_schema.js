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
    location: {
      latitude: Number,
      longitude: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now
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
