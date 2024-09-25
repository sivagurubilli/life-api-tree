'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var planSchema = new Schema({
    name: { type: String, trim: true, required: true },
    type: { type: Number, trim: true, required: true },
    validityInDays: { type: Number, required: true },
    upgradePlan: { type: Boolean, default: false },
    price: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    status: { type: Number, required: true, default: 1 },
    directReferralPoints: { type: Number, required: true, default: 333 },
    referralProgram: { type: Number, required: true, enum: [0, 1] },
    categoryId: [{ type: Schema.Types.ObjectId, ref: "categories" }],
    applePlanId: { type: String },
    maxCourse: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('plans', planSchema);