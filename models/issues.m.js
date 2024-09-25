'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var issueSchema = new Schema({
    name: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    status: { type: Number, required: true, enum: [0, 1], default: 1 },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('issues', issueSchema);