'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var seriesSchema = new Schema({
    combinationId: { type: Schema.Types.ObjectId, required: true, ref: "coursesubjectcombination" },
    subjectId: { type: Schema.Types.ObjectId, required: true, ref: "subjects" },
    courseId: { type: Schema.Types.ObjectId, required: true, ref: "courses" },
    seriesNumber: { type: Number, required: true },
    seriesName: { type: String, required: true },
    status: { type: Number, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('series', seriesSchema);