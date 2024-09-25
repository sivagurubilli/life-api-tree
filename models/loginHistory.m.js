'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var loginHistorySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users' },
    lastLoginTime: { type: Date, required: true },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('loginhistory', loginHistorySchema);
