'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var materialSchema = new Schema({
    unitId: { type: Schema.Types.ObjectId, required: true, ref: "units" },
    materialName: { type: String, required: true, trim: true },
    materialUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    materialNumber: { type: Number, required: true },
    type: { type: String, default: "pdf", required: true },
    status: { type: Number, required: true, trim: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('materials', materialSchema);