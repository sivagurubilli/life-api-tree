let { capitalizeEveryInnerWord, responseJson, sendMail, isRequestDataValid, calculateAssessmentPercentage } = require('../utils/appUtils');
let { User, CurrentAffairs, UserCurrentAffairLogs, UserQuizLogs, QuizContent, QuizCategory, QuizContentNew, QuizCategoryNew } = require('../models');
const { getCurrentDateAndTime, isValidMonthName } = require("../helpers/dates");
const mongoose = require('mongoose')
const { sendBulkNotificationsToUsers } = require("../helpers/notifications");

exports.addCurrentAffairs = async (req, res, next) => {
    try {
        let {
            monthName,
            questions,
            date

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            monthName,
            questions,
            date
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        let currentDate = getCurrentDateAndTime();
        isValidMonthName(monthName);

        let data = await CurrentAffairs.create({
            monthName,
            questions,
            date,
            createdAt: currentDate,
            updatedAt: currentDate
        });
        if (!data) throw { message: "Unable to add current affairs. Try again" }
        await sendBulkNotificationsToUsers();
        res.status(201).send({ status: 1, message: "Current affairs added successfully", data })
    }
    catch (e) {
        next(e)
    }
}

exports.editCurrentAffairs = async (req, res, next) => {
    try {

        let {
            monthName,
            questions,
            date,
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await CurrentAffairs.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No data found!" }

        let updateBody = { updatedAt: getCurrentDateAndTime() };
        if (monthName) isValidMonthName(monthName), updateBody.monthName = monthName;
        if (questions) updateBody.questions = questions;
        if (date) updateBody.date = date;

        data = await CurrentAffairs.findOneAndUpdate({ _id: id }, {
            $set: updateBody
        }, { new: true });
        res.status(200).send({ status: 1, message: "Current affairs updates successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.deletCurrentAffairs = async (req, res, next) => {
    try {

        let {
            id
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        await CurrentAffairs.findOneAndDelete({ _id: id });
        await UserCurrentAffairLogs.deleteMany({ currentAffairsId: id });
        res.status(200).send({ status: 1, message: "Current affairs deleted successfully!", data: {} })
    }
    catch (e) {
        next(e)
    }
}

exports.fetchCurrentAffairsByAdmin = async (req, res, next) => {
    try {

        let {
            monthName,
            id
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let dbQuery = {};
        if (id) dbQuery._id = id;
        if (monthName) isValidMonthName(monthName), dbQuery.monthName = monthName;
        let data = await CurrentAffairs.find(dbQuery).sort({ date: -1 })

        if (!id && data.length) {
            if (monthName) data = [{ monthName: monthName.toLowerCase(), currentAffairsData: data }]
            else if (!monthName) {
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
        }
        res.status(200).send({ status: 1, message: "Current affairs fetched successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.fetchCurrentAffairsByUser = async (req, res, next) => {
    try {

        let {
            monthName
        } = Object.assign(req.body, req.query, req.params)

        let userId = req.user._id;

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
                    from: 'usercurrentaffairlogs', // The name of the user logs collection
                    localField: '_id',
                    foreignField: 'currentAffairsId',
                    as: 'userLogs',
                },
            },
            {
                $addFields: {
                    isRead: {
                        $in: [mongoose.Types.ObjectId(userId), '$userLogs.userId'],
                    },
                    customMonthOrder: {
                        $arrayElemAt: [Object.values(monthsOrder), { $indexOfArray: [Object.keys(monthsOrder), '$monthName'] }]
                    }
                },
            },
            {
                $sort: {
                    date: -1

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
        res.status(200).send({ status: 1, message: "Current affairs fetched successfully!", data })
    }
    catch (e) {
        next(e)
    }
}


exports.saveCurrentAffairLog = async (req, res, next) => {
    try {

        let {
            currentAffairsId,
            responses
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            currentAffairsId,
            responses
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (!responses.length) throw { statusCode: 500, msg: "No response found" }

        let currentAffairsData = await CurrentAffairs.findOne({ _id: currentAffairsId });
        if (!currentAffairsData) throw { status: 404, message: "No current affairs found!" }

        let data = await UserCurrentAffairLogs.create({
            currentAffairsId,
            responses,
            userId: req.user._id,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        })

        if (!data) throw { status: 500, message: "Current affairs saving failed. Try again" }
        res.status(200).send({ status: 200, message: "Current affairs saved successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getTopCurrentAffairs = async (req, res, next) => {
    try {

        let userId = req.user._id;
        let currentAffairsData = await CurrentAffairs.find({}).sort({ createdAt: -1 }).limit(5).lean();
        currentAffairsData = JSON.parse(JSON.stringify(currentAffairsData))
        if (currentAffairsData.length) {
            for (let x of currentAffairsData) {
                let userCurrentAffairsData = await UserCurrentAffairLogs.findOne({ currentAffairsId: x._id, userId }).lean();
                if (userCurrentAffairsData) x.isRead = true;
                else x.isRead = false;
            }
        }
        res.status(200).send({ status: 1, message: 'Top current affairs fetched successfully!', dataCount: currentAffairsData.length, data: currentAffairsData })
    }
    catch (e) {
        next(e)
    }
}

exports.getQuizContentsListByUser = async (req, res, next) => {
    try {


        let {
            quizCategoryId,
            quizContentId,
            date,
            limit,
            skip,
            page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            quizCategoryId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)
        let userId = req.user._id;

        let categoryData = await QuizCategory.findOne({ _id: quizCategoryId, isDeleted: false });
        if (!categoryData) throw { status: 404, message: "No quiz category found!" }

        let matchDbFilters = {
            quizCategoryId: mongoose.Types.ObjectId(quizCategoryId),
            isDeleted: false
        }
        if (quizContentId) {
            let contentData = await QuizContent.findOne({ _id: quizContentId, isDeleted: false });
            if (!contentData) throw { status: 404, message: "No content found!" }
            matchDbFilters._id = mongoose.Types.ObjectId(quizContentId)
        }
        // if (date) matchDbFilters.date = date;

        let totalDataCount = await QuizContent.find(matchDbFilters).countDocuments();
        let data = await QuizContent.aggregate([
            {
                $match: matchDbFilters
            },
            {
                $sort: {
                    date: -1
                }
            },
            {
                $lookup: {
                    from: "userquizlogs",
                    let: { quizContentId: "$_id", userId: mongoose.Types.ObjectId(userId) },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ["$userId", "$$userId"] }, { $eq: ["$quizContentId", "$$quizContentId"] }] } } },
                        { $project: { _id: 1 } }
                    ],
                    as: "userLogs"
                }
            },
            {
                $addFields: {
                    isRead: { $gt: [{ $size: "$userLogs" }, 0] }
                }
            },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    quizCategoryId: 1,
                    content: 1,
                    isDeleted: 1,
                    isRead: 1
                }
            },
            { $skip: skip },
            { $limit: limit }
        ])
        res.status(200).send({ status: 1, message: "Current affairs fetched successfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}

exports.readQuizContent = async (req, res, next) => {
    try {
        let quizContentId = req.body.quizContentId;
        if (!quizContentId) throw { status: 400, message: "Please provide quiz content Id" }
        let contentData = await QuizContent.findOne({ _id: quizContentId, isDeleted: false });
        if (!contentData) throw { status: 404, message: "No content found!" }

        let data = await UserQuizLogs.findOneAndUpdate(
            {
                userId: req.user._id, quizContentId, quizCategoryId: contentData.quizCategoryId
            },
            {
                userId: req.user._id, quizContentId, quizCategoryId: contentData.quizCategoryId, createdAt: getCurrentDateAndTime(),
                updatedAt: getCurrentDateAndTime()
            },
            {
                new: true, upsert: true
            })
        if (!data) throw { message: "Unable to store. Try again" }
        res.status(200).send({ status: 1, message: "Quiz content logged successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

