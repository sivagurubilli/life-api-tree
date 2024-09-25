'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var subjectSchema = new Schema({
    subjectName: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    status: { type: Number, required: true, trim: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('subjects', subjectSchema);