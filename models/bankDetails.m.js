'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var bankDetailSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    accountHolderName: { type: String, trim: true },
    bankName: { type: String, trim: true, uppercase: true, required: true },
    accountNumber: { type: String, trim: true, required: true },
    ifscCode: { type: String, trim: true, uppercase: true, required: true },
    accountType: { type: String, trim: true, required: true, enum: ['SAVINGS', 'CURRENT'] },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('bankdetails', bankDetailSchema);