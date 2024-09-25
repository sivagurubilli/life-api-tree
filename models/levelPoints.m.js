'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var levelPointSchema = new Schema({
    level: { type: Number, unique: true, index: true, sparse: true },
    points: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('levelpoints', levelPointSchema);