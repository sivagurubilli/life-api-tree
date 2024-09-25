'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userCourseUnlockCounterSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "subjects", required: true },
    combinationId: { type: Schema.Types.ObjectId, ref: "combinations", required: true },
    nextUnlockedUnitNumber: { type: Number, required: true },
    nextUnlockedChapterNumber: { type: Number, required: true },
    nextUnlockDate: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
}, { toObject: { virtuals: true }, toJSON: { virtuals: true } });

module.exports = mongoose.model('usercourseunlockcounters', userCourseUnlockCounterSchema);

