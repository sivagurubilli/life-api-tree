'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const userQuizLogSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    quizContentId: { type: Schema.Types.ObjectId, required: true, ref: "quizcontents" },
    quizCategoryId: { type: Schema.Types.ObjectId, required: true, ref: "quizcategories" },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('userquizlogs', userQuizLogSchema);

