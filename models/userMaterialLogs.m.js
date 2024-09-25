'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userMaterialLogSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users" },
    unitId: { type: Schema.Types.ObjectId, ref: "units" },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('usermateriallogs', userMaterialLogSchema);

