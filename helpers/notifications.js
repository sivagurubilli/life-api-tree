let { sendNotice } = require("../utils/appUtils");
let { User } = require('../models')

exports.sendBulkNotifications = async (body) => {
    let resp = await sendNotice({
        title: body.title,
        body: body.message,
        data: {
            screen: body.screen
        },
        userToken: body.tokens
    })
}

// Recursive function to process array in chunks
exports.processNotificationsInChunks = async (body) => {
    const { tokens, chunkSize, message, title, screen } = body;
    if (tokens.length === 0) {
        return;
    }
    const chunk = tokens.slice(0, chunkSize);
    console.log({ chunkCount: chunk.length })
    await Promise.all([
        exports.sendBulkNotifications({ tokens: chunk, message, title, screen })
    ]);
    this.processNotificationsInChunks({ tokens: tokens.slice(chunkSize), chunkSize, message, title, screen });
}

exports.sendBulkNotificationsToUsers = async (body) => {

    let tokens = await User.find({ status: { $nin: [0] }, firebaseToken: { $ne: null, $exists: true } }).distinct('firebaseToken');
    tokens = JSON.parse(JSON.stringify(tokens));
    console.log({ tokensLength: tokens.length })
    if (tokens.length) {
        console.log({ tokensCount: tokens.length })
        await exports.processNotificationsInChunks({ screen: "CurrentAffairs", chunkSize: 800, tokens, title: `Current affairs updated for today`, message: `Read latest current affairs` })
    }
}