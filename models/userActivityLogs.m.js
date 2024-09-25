'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userActivityLogsSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    activity: {
        type: String, required: true, enum: [
            "user_login",
            "current_affairs_viewed",
            "quiz_viewed",
            "fundamental_pretest_viewed",
            "fundamental_pretest_submitted",
            "fundamental_finaltest_viewed",
            "fundamental_finaltest_submitted",
            "fundamental_material_viewed",
            "fundamental_material_submitted",
            "course_pretest_viewed",
            "course_pretest_submitted",
            "course_finaltest_viewed",
            "course_finaltest_submitted",
            "course_material_viewed",
            "course_material_submitted"
        ]
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

module.exports = mongoose.model('useractivities', userActivityLogsSchema);