'use strict';
var mongoose = require('mongoose');

var schema = mongoose.Schema;
var visitorSchema = new schema({
    mobileNo: { type: Number, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    qualification: { type: String, trim: true, required: true },
    createdAt: Date,
    updatedAt: Date
}, { toObject: { virtuals: true }, toJSON: { virtuals: true } })

module.exports = mongoose.model('visitors', visitorSchema);