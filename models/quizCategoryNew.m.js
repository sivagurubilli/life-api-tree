
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var quizCategorySchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['mcq', 'content'] },
    icon: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
});

module.exports = mongoose.model('quizcategoriesnew', quizCategorySchema);



