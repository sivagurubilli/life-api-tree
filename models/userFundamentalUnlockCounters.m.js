'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userUnlockCounterSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users" },
    subjectId: { type: Schema.Types.ObjectId, ref: "fundamentalsubjects" },
    nextUnlockedUnitNumber: { type: Number, required: true },
    nextUnlockedChapterNumber: { type: Number, required: true },
    nextUnlockDate: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
}, { toObject: { virtuals: true }, toJSON: { virtuals: true } });

module.exports = mongoose.model('userfundamentalunlockcounters', userUnlockCounterSchema);

