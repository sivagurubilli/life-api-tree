'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var walletHistorySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    joinerId: { type: Schema.Types.ObjectId, ref: 'users' },                 //Not required for debit related transactions
    points: { type: Number, required: true },
    pointsType: { type: Number, enum: [1, 2] },   //1=Real points, 2=Projected points
    transactionType: { type: String, enum: ['credit', 'debit'], lowercase: true, trim: true },
    depositType: { type: String, enum: ['directreferralpoints', 'chainlevelpoints'], lowercase: true, trim: true },
    withdrawlStatus: { type: String },
    withdrawlType: { type: String, enum: ['banktransfer', 'planrenewal'], lowercase: true, trim: true },
    withdrawlBankDetailsId: { type: Schema.Types.ObjectId, ref: 'bank_details' },
    withdrawlPayoutDate: { type: Date },
    withdrawlApprovedOn: { type: Date },
    withdrawlConfirmationId: { type: String, trim: true },
    message: { type: String },
    createdAt: { type: Date },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('walletHistory', walletHistorySchema);

