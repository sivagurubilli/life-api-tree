'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userCoursesSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "users" },
    categoryId: { type: Schema.Types.ObjectId, ref: "categories" },
    courseId: { type: Schema.Types.ObjectId, ref: "courses" },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});
module.exports = mongoose.model('userCourses', userCoursesSchema);

