'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var unitSchema = new Schema({
    chapterId: { type: Schema.Types.ObjectId, required: true, ref: "chapters" },
    subjectId: { type: Schema.Types.ObjectId, ref: "subjects" },
    courseId: { type: Schema.Types.ObjectId, ref: "courses" },
    unitNumber: { type: Number, sparse: true },
    status: { type: Number, required: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('units', unitSchema);