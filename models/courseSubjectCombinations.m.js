'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var subjectSchema = new Schema({
    subjectId: { type: Schema.Types.ObjectId, required: true, ref: "subjects" },
    courseId: { type: Schema.Types.ObjectId, required: true, ref: "courses" },
    status: { type: Number, required: true, trim: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('coursesubjectcombinations', subjectSchema);