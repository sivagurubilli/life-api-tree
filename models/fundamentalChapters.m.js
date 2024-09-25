'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fundamentalChapterSchema = new Schema({
    subjectId: { type: Schema.Types.ObjectId, required: true, ref: "fundamentalsubjects" },
    chapterNumber: { type: Number },
    chapterName: { type: String, required: true },
    status: { type: Number, required: true, trim: true, default: 1, enum: [0, 1] },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});
module.exports = mongoose.model('fundamentalchapters', fundamentalChapterSchema);