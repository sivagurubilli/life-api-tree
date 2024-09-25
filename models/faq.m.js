'use strict';

var mongoose = require('mongoose');

var schema = mongoose.Schema;
var faqSchema = new schema({
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    status: { type: Number, enum: [0, 1], default: 1 },
    createdAt: Date,
    updatedAt: Date
});

// no.of clients, no.of transformations
module.exports = mongoose.model('faqs', faqSchema);