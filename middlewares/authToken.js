const jwt = require('jsonwebtoken')
let { privateKey, adminEmail, backendUrl } = require('../config/config')
let { User } = require('../models')
const { getCurrentDate } = require("../helpers/dates");


exports.generateAccessToken = (data) => {
    let token = jwt.sign({ id: data._id }, privateKey, { expiresIn: 60 * 60 * 24 * 60 }); //2 months in seconds
    return token
}

exports.generateRefreshToken = (data) => {
    let token = jwt.sign({ id: data._id }, privateKey);
    return token
}

//Verification setup for the provided access token
exports.validateUserAccessToken = async (req, res, next) => {

    try {
        let decoded;
        let role;
        let token = req.headers["access-token"];
        if (!token) throw { status: 499, message: "Token missing in headers" }

        jwt.verify(token, privateKey, (err, decodedData) => {
            if (err) {
                if (err.name === 'TokenExpiredError') throw { status: 401, message: "Unauthorized user" }
                else throw { status: 498, message: "Invalid token" }
            } else decoded = decodedData;
        });

        //Finding the user in All collections
        let user = await User.findOne({ _id: decoded.id, status: { $nin: [0] }, isDeleted: false })
        if (!user) throw { status: 401, message: "Unauthorized user" }
        user = JSON.parse(JSON.stringify(user));
        req.user = user;
        req.user.role = "user";
        next();
    }
    catch (e) {
        res.status(e.status || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
};

//Verification setup for the provided token
exports.validateAdminAccessToken = async (req, res, next) => {

    try {
        let decoded;
        let role;
        let token = req.headers["access-token"];
        if (!token) throw { status: 499, message: "Token missing in headers" }

        jwt.verify(token, privateKey, (err, decodedData) => {
            if (err) {
                if (err.name === 'TokenExpiredError') throw { status: 401, message: "Unauthorized user" }
                else throw { status: 498, message: "Invalid token" }
            } else decoded = decodedData;
        });

        //Finding the user in All collections
        let user = await User.findOne({ _id: decoded.id, role: "admin" }).lean();
        if (!user) throw { status: 401, message: "Unauthorized user" }
        user = JSON.parse(JSON.stringify(user));
        req.user = user;
        req.user.role = "admin";
        next();
    }
    catch (e) {
        res.status(e.status || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
};

exports.validateSpecialAccess = async (req, res, next) => {
    try {
        const user = req.user;
        const status = req.user.status;
        console.log({ status })
        if (status != 4) {
            const referralsCount = await User.find({ sponsorCode: req.user.referralCode }).countDocuments();
            const userRegisteredDate = (req.user.createdAt).split('T')[0];
            const currentDate = getCurrentDate();
            console.log({ userRegisteredDate, currentDate })
            var differenceMs = new Date(currentDate) - new Date(userRegisteredDate);
            var differenceDays = parseInt(differenceMs / (1000 * 60 * 60 * 24)) + 1;
            console.log({ differenceDays })
            if (differenceDays > 3 && referralsCount < 3) {
                throw { status: 409, message: "Refer 3 people or Buy Plan to continue" }
            }
        }
        next();
    }
    catch (error) {
        next(error)
    }
}