'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const optionSchema = new Schema({
    optionNumber: { type: Number, required: true },
    optionValue: { type: String, required: true, trim: true },
});

const questionSchema = new Schema({
    type: {
        type: String, required: true, enum: {
            values: ['text', 'audio', 'video'],
            message: 'Invalid type. Must be "text," "audio," or "video."'
        },
        default: 'text'
    },
    question: { type: String, required: true, trim: true },
    questionNumber: { type: Number, },
    correctOption: { type: Number, required: true },
    options: [optionSchema],
    explanation: { type: String, trim: true }
});

const seriesTestSchema = new Schema({
    seriesId: { type: Schema.Types.ObjectId, ref: "series" },
    questions: [questionSchema],
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('seriestests', seriesTestSchema);

