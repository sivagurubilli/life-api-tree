'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;



const questionSchema = new Schema({
    questionId: { type: String, required: true },
    selectedOption: { type: Number, required: true },
    correctOption: { type: Number, required: true },
    isAnswerCorrect: { type: Number, required: true, enum: [0, 1] }
});
const userAssessmentLogSchema = new Schema({
    challengeId: { type: Schema.Types.ObjectId, required: true, ref: "challenges" },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    courseId: { type: Schema.Types.ObjectId, required: true, ref: "courses" },
    assessmentId: { type: Schema.Types.ObjectId, required: true, ref: "assessments" },
    isDeleted: { type: Boolean, default: false },
    percentage: { type: Number, required: true },
    responses: [questionSchema],
    day: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('userassessmentlogs', userAssessmentLogSchema);

