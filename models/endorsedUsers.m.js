'use strict';
var mongoose = require('mongoose');

var schema = mongoose.Schema;
var endorsedUserSchema = new schema({
    userId: { type: schema.Types.ObjectId, ref: "users", required: true },
    level: { type: Number, required: true },
    slotPosition: { type: String, required: true },
    slotNumber: { type: Number, required: true },
    parentId: { type: schema.Types.ObjectId, ref: 'users', required: true },
    leftChild: { type: schema.Types.ObjectId, ref: 'users' },
    middleChild: { type: schema.Types.ObjectId, ref: 'users' },
    rightChild: { type: schema.Types.ObjectId, ref: 'users' },
    referralCode: { type: String, uppercase: true, trim: true, minlength: 10, required: true },
    sponsorId: { type: schema.Types.ObjectId, ref: 'users', required: true },
    sponsorCode: { type: String, uppercase: true, trim: true, minlength: 10, required: true },
    isDirectReferral: { type: Boolean, required: true },
    planStartsAt: { type: Date, required: true },
    planExpiresAt: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
})

module.exports = mongoose.model('endorsedusers', endorsedUserSchema);


