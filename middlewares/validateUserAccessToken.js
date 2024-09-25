let { responseJson } = require('../utils/appUtils');
let { User } = require('../models')
const { privateKey } = require("../config/config");
const jwt = require('jsonwebtoken')

//Verification setup for the provided token
exports.validateUserAccessToken = async (req, res, next) => {

    try {
        let token = req.headers["x-access-token"];
        if (!token) throw { statusCode: 499, msg: "Token missing in headers" }

        jwt.verify(token, privateKey, (err, decodedData) => {
            if (err) {
                if (err.name === 'TokenExpiredError') throw { statusCode: 403, msg: "Session expired" }
                else throw { statusCode: 498, msg: "Invalid token" }
            } else decoded = decodedData;
        });

        //Finding the user in collections
        let user = await User.findOne({ accessToken: token })
        if (!user) throw { statusCode: 401, msg: "Unauthorized user" }
        next();
    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Session Timed Out.Try again', e))
    }
};