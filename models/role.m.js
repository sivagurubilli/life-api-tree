'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var roleSchema = new Schema({
  name: String,
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('roles', roleSchema);

