'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var challengeSchema = new Schema({
    courseId: { type: Schema.Types.ObjectId, ref: 'courses', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'categories', required: true },
    type: { type: Number, enum: [1, 2, 3], required: true },   //1=all,2=paid,3=free
    title: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    lastDate: { type: Date, required: true },
    resultsOutDate: { type: Date, required: true },
    rules: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});


module.exports = mongoose.model('challenges', challengeSchema);
