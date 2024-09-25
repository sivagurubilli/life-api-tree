'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pendingEndorsedUserSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users", trim: true, required: true },
    sponsorId: { type: Schema.Types.ObjectId, ref: "categories", trim: true, required: true },
    sponsorCode: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('pendingendorsedusers', pendingEndorsedUserSchema);

