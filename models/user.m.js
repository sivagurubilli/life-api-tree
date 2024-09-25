'use strict';
var mongoose = require('mongoose');

var schema = mongoose.Schema;
var userSchema = new schema({
  endorsedId: { type: schema.Types.ObjectId, ref: "endorsedusers" },
  paymentId: { type: schema.Types.ObjectId, ref: "payments" },
  mobileNo: { type: String },
  name: { type: String },
  email: { type: String },
  password: { type: String },
  isVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  dob: { type: Date },
  profileImageUrl: { type: String, default: 'https://life-octal.s3.ap-south-1.amazonaws.com/life/1693033185559-LIFE_PROFILE_IMG.png' },
  level: Number,
  slotPosition: String,
  slotNumber: Number,
  parentId: { type: schema.Types.ObjectId, ref: 'users' },
  leftChild: { type: schema.Types.ObjectId, ref: 'users' },
  middleChild: { type: schema.Types.ObjectId, ref: 'users' },
  rightChild: { type: schema.Types.ObjectId, ref: 'users' },
  referralCode: { type: String, uppercase: true, trim: true, minlength: 10 },
  sponsorId: { type: schema.Types.ObjectId, ref: 'users' },
  sponsorCode: { type: String, uppercase: true, trim: true, minlength: 10 },
  isDirectReferral: { type: Boolean },
  lastLoginTime: { type: Date },
  isLoggedIn: { type: Boolean },
  planStartsAt: { type: Date },
  planExpiresAt: { type: Date },
  trialExpiresAt: { type: Date },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number], default: undefined }
  },
  role: { type: String, trim: true, required: true },
  firebaseToken: { type: String },
  isDeleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  accessToken: String,
  refreshToken: String,
  callAccess: { type: Boolean, default: false },
  dailyCallsLimit: { type: Number, default: 0 },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  status: { type: Number, default: 1, enum: [1, 2, 3, 4] },                //1= New user with 28 days grace period,2=Plan Expired User,3=Subscribed but only Course,4= Subscribed course & referralProgram
  referralProgram: { type: Number, enum: [0, 1] },
  maxCourse: { type: Number }
})


// Hiding the secret keys
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('users', userSchema);


