
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var quizContentSchema = new Schema({
    date: { type: Date, required: true },
    quizCategoryId: { type: Schema.Types.ObjectId, ref: 'quizcategories', required: true },
    content: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('quizcontents', quizContentSchema);



