'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fundamentalUnitSchema = new Schema({
    chapterId: { type: Schema.Types.ObjectId, required: true, ref: "fundamentalchapters" },
    subjectId: { type: Schema.Types.ObjectId, ref: "fundamentalsubjects" },
    unitNumber: { type: Number, sparse: true },
    status: { type: Number, required: true, trim: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('fundamentalunits', fundamentalUnitSchema);