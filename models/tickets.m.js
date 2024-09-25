'use strict';

var mongoose = require('mongoose');
var schema = mongoose.Schema;

var ticketSchema = new schema({
    issueId: { type: schema.Types.ObjectId, ref: 'issues' },
    userId: { type: schema.Types.ObjectId, ref: 'users' },
    status: { type: String, trim: true, enum: ['open', 'closed'], default: 'open' },
    issueSubject: { type: String, trim: true },
    description: { type: String, trim: true },
    resolution: { type: String, trim: true },
    ticketNumber: { type: String, unique: true, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('tickets', ticketSchema);