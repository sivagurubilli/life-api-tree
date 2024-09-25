const mongoose = require("mongoose");
let { privateKey, adminEmail } = require('../config/config')
let { generateAge, generateReferralCode, generateSlotNumberWithchildSlotPosition, fetchChildSlotPosition, fetchNextAvailableSlotPosition,
    generateSlotNumber, responseJson, sendMail, isRequestDataValid, capitalizeEveryInnerWord, logger, sendOtp,
    sendOtpOld, generateOtp, sendMobileSms } = require('../utils/appUtils');
let { CurrentAffairs, VisitorCurrentAffairLogs, Visitor } = require('../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const { getCurrentDateAndTime, isValidMonthName } = require("../helpers/dates.js");
const smsTemplates = require("../utils/smsTemplates");

exports.visitorLogin = async (req, res, next) => {
    try {

        let {
            name,
            email,
            mobileNo,
            qualification

        } = Object.assign(req.body)

        let requiredFields = {
            name, email,
            mobileNo,
            qualification
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        name = capitalizeEveryInnerWord(name);
        email = (email.toLowerCase()).trim();


        let data = await Visitor.findOne({ email, mobileNo });
        if (!data) {
            data = await Visitor.create({ email, mobileNo, name: capitalizeEveryInnerWord(name), qualification, createdAt: getCurrentDateAndTime(), updatedAt: getCurrentDateAndTime() });
            let message = (smsTemplates.visitorRegistrationTemplate);
            let smsResp = await sendMobileSms({ message, mobileNo });
        }

        res.status(200).send({ status: 1, message: "Logged-in successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchCurrentAffairsByUser = async (req, res, next) => {
    try {

        let {
            monthName,
            visitorId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            visitorId,
            monthName
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        const monthsOrder = {
            'january': 1,
            'february': 2,
            'march': 3,
            'april': 4,
            'may': 5,
            'june': 6,
            'july': 7,
            'august': 8,
            'september': 9,
            'october': 10,
            'november': 11,
            'december': 12
        };

        let dbQuery = {};

        if (monthName) isValidMonthName(monthName), dbQuery.monthName = monthName;

        let aggregateQuery = [];

        //Optional_Saging
        if (monthName) {
            aggregateQuery.push({
                $match: {
                    monthName: monthName,
                },
            },)
        }

        //Mandatory_Stage
        aggregateQuery.push(
            {
                $lookup: {
                    from: 'visitorcurrentaffairlogs', // The name of the user logs collection
                    localField: '_id',
                    foreignField: 'currentAffairsId',
                    as: 'userLogs',
                },
            },
            {
                $addFields: {
                    isRead: {
                        $in: [mongoose.Types.ObjectId(visitorId), '$userLogs.visitorId'],
                    },
                    customMonthOrder: {
                        $arrayElemAt: [Object.values(monthsOrder), { $indexOfArray: [Object.keys(monthsOrder), '$monthName'] }]
                    }
                },
            },
            {
                $sort: {
                    customMonthOrder: -1,
                    date: 1

                }
            },
            {
                $project: {
                    userLogs: 0,
                },
            })



        let data = await CurrentAffairs.aggregate(aggregateQuery);
        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            const groupedData = {};
            data.forEach((item) => {
                const monthName = item.monthName;
                if (!groupedData[monthName]) {
                    groupedData[monthName] = { monthName, currentAffairsData: [] };
                }
                groupedData[monthName].currentAffairsData.push(item);
            });
            data = Object.values(groupedData);
        }

        res.status(200).send({ status: 1, message: "Current affairs fetched successfully!", totalDataCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}

exports.saveCurrentAffairLog = async (req, res, next) => {
    try {

        let {
            currentAffairsId,
            visitorId,
            responses
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            visitorId,
            currentAffairsId,
            responses
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (!responses.length) throw { statusCode: 500, msg: "No response found" }

        let currentAffairsData = await CurrentAffairs.findOne({ _id: currentAffairsId });
        if (!currentAffairsData) throw { status: 404, message: "No current affairs found!" }

        let data = await VisitorCurrentAffairLogs.create({
            currentAffairsId,
            responses,
            visitorId
        })

        if (!data) throw Error("Unable to save current affairs logs.Try again")
        res.status(200).send({ status: 1, message: "Logs saved successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

