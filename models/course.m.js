'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var courseSchema = new Schema({
    categoryId: { type: Schema.Types.ObjectId, ref: 'categories', required: true },
    courseName: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    status: { type: Number, required: true, trim: true, default: 1 },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('courses', courseSchema);
