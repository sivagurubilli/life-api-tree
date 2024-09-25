'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const questionSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: "currentaffairs", required: true },
    questionNumber: { type: Number, },
    correctOption: { type: Number, required: true },
    selectedOption: { type: Number, required: true }
});

var userCurrentAffairLogSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users" },
    currentAffairsId: { type: Schema.Types.ObjectId, ref: "currentaffairs" },
    isDeleted: { type: Boolean, default: false },
    responses: [questionSchema],
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('usercurrentaffairlogs', userCurrentAffairLogSchema);

