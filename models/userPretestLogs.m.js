'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const questionSchema = new Schema({
    questionId: { type: String, required: true },
    selectedOption: { type: Number, required: true },
    correctOption: { type: Number, required: true },
    isAnswerCorrect: { type: Number, required: true, enum: [0, 1] }
});

const userPreTestLogSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    unitId: { type: Schema.Types.ObjectId, required: true, ref: "units" },
    maxPercentage: { type: Number },
    currentAttemptPercentage: { type: Number },
    lastAttemptedAt: { type: Date },
    testId: { type: Schema.Types.ObjectId, ref: "pretests" },
    responses: [questionSchema],
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('userpretestlogs', userPreTestLogSchema);

