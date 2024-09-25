'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var challengeWinnerSchema = new Schema({
    challengeId: { type: Schema.Types.ObjectId, ref: 'challenges', required: true },
    winners: [{ type: Schema.Types.ObjectId, ref: 'users', required: true }],
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});


module.exports = mongoose.model('challengewinners', challengeWinnerSchema);
