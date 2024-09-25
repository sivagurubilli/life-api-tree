'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var basicLevelSchema = new Schema({
    level: { type: Number, required: true, unique: true },
    slot: { type: Number, required: true, unique: true },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('basicLevels', basicLevelSchema);