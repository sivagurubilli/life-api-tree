'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var paymentSchema = new Schema({
    isSelfPurchased: { type: Boolean, default: true },
    purchaseType: { type: Number, default: 1 },                //1=direct-plan,2=upgrade-plan
    userId: { type: Schema.Types.ObjectId, ref: 'users' },
    planId: { type: Schema.Types.ObjectId, ref: 'plans' },
    amount: { type: Number },
    orderId: { type: String, trim: true },
    paymentId: { type: String, trim: true },
    rzpSignature: { type: String, trim: true },
    paymentType: { type: String, trim: true },
    paymentStatus: { type: Number, default: 0, enum: [0, 1] },
    planStartsAt: { type: Date },
    planExpiresAt: { type: Date },
    paymentData: {
        type: Object
    },
    directReferralPoints: { type: Number },
    invoiceNumber: { type: String },
    invoiceUrl: { type: String },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('payments', paymentSchema);