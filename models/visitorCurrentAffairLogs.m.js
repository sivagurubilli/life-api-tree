'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const questionSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: "currentaffairs", required: true },
    questionNumber: { type: Number, },
    correctOption: { type: Number, required: true },
    selectedOption: { type: Number, required: true }
});

var visitorCurrentAffairLogSchema = new Schema({
    visitorId: { type: Schema.Types.ObjectId, ref: "visitors" },
    currentAffairsId: { type: Schema.Types.ObjectId, ref: "currentaffairs" },
    isDeleted: { type: Boolean, default: false },
    responses: [questionSchema],
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('visitorcurrentaffairlogs', visitorCurrentAffairLogSchema);

