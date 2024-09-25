'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userChallengeSchema = new Schema({
    challengeId: { type: Schema.Types.ObjectId, required: true, ref: "challenges" },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    courseId: { type: Schema.Types.ObjectId, required: true, ref: "courses" },
    categoryId: { type: Schema.Types.ObjectId, ref: 'categories', required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('userchallenges', userChallengeSchema);