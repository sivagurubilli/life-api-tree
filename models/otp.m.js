
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var otpSchema = new Schema({
  mobileNo: String,
  otp: String,
  email: String,
  createdAt: { type: Date, expires: '15m', default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('otps', otpSchema);



