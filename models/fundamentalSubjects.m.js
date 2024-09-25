'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fundamentalSubjectSchema = new Schema({
    subjectName: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    status: { type: Number, required: true, trim: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('fundamentalsubjects', fundamentalSubjectSchema);