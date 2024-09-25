'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;



const questionSchema = new Schema({
    questionId: { type: String, required: true },
    selectedOption: { type: Number, required: true },
    correctOption: { type: Number, required: true },
    isAnswerCorrect: { type: Number, required: true, enum: [0, 1] }
});

const userFinalTestLogSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    unitId: { type: Schema.Types.ObjectId, required: true, ref: "fundamentalunits" },
    chapterId: { type: Schema.Types.ObjectId, required: true, ref: "fundamentalchapters" },
    subjectId: { type: Schema.Types.ObjectId, ref: "fundamentalsubjects" },
    testId: { type: Schema.Types.ObjectId, ref: "fundamentalfinaltests" },
    maxPercentage: { type: Number, required: true },
    currentAttemptPercentage: { type: Number },
    lastAttemptedAt: { type: Date },
    responses: [questionSchema],
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('userfundamentalfinaltestlogs', userFinalTestLogSchema);

