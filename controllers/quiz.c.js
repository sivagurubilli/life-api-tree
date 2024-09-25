let { capitalizeEveryInnerWord, responseJson, sendMail, isRequestDataValid, calculateAssessmentPercentage } = require('../utils/appUtils');
let { User, CurrentAffairs, UserCurrentAffairLogs, UserQuizLogs, QuizContent, QuizCategory, QuizContentNew, QuizCategoryNew, UserQuizLogsNew } = require('../models');
const { getCurrentDateAndTime, isValidMonthName } = require("../helpers/dates");
const mongoose = require('mongoose')
const { sendBulkNotificationsToUsers } = require("../helpers/notifications");


/*------------------------------------QUIZ-APIS-------------------------------*/
exports.addQuizCategory = async (req, res, next) => {
    try {

        let {
            name,
            icon,
            type

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            name,
            icon,
            type
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (type !== "content" && type !== "mcq") throw { status: 400, message: "Please provide a valid type" }

        let data = await QuizCategoryNew.create({
            name: capitalizeEveryInnerWord(name),
            icon,
            type,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw Error("Unable to store quiz category.Try again")
        res.status(201).send({ status: 1, message: "Quiz category added successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getQuizCategoriesList = async (req, res, next) => {
    try {
        let {
            id,
            name,
            icon,
            limit,
            skip,
            page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (name) dbQuery.name = name;

        let data = await QuizCategoryNew.find(dbQuery).limit(limit).skip(skip);
        let totalDataCount = await QuizCategoryNew.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Quiz categories list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editQuizCategory = async (req, res, next) => {
    try {
        let {
            id,
            name,
            icon,
            type

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (type && type !== "content" && type !== "mcq") throw { status: 400, message: "Please provide a valid type" }


        let data = await QuizCategoryNew.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No Quiz Category found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (name) dbQuery.name = capitalizeEveryInnerWord(name);
        if (icon) dbQuery.icon = icon;
        if (type) dbQuery.type = type;

        data = await QuizCategoryNew.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Quiz category edited successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteQuizCategory = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await QuizCategoryNew.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        if (!data) throw { status: 404, message: "No quiz category found!" }
        res.status(200).send({ status: 1, message: "Quiz category deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}


/*--------------------------------------QUIZ CONTENT APIS-------------------------*/
exports.addQuizContent = async (req, res, next) => {
    try {

        let {
            quizCategoryId,
            content,
            date,
            questions
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            quizCategoryId,
            date
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let categoryData = await QuizCategoryNew.findOne({ _id: quizCategoryId, isDeleted: false });
        if (!categoryData) throw { status: 404, message: "No quiz category found!" }
        if (categoryData.type == "mcq" && (!questions || !questions.length)) throw { status: 400, message: "Questions cannot be empty" }
        if (categoryData.type == "content" && !content) throw { status: 400, message: "Please provide content" }

        let data = await QuizContentNew.findOne({ quizCategoryId, date, isDeleted: false });
        if (data) throw { status: 409, message: "Quiz Content is already added for this date on this Quiz category . Try another!" }

        let dbQuery = {
            quizCategoryId,
            date,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        }
        if (categoryData.type == "content") dbQuery.content = content;
        else if (categoryData.type == "mcq") dbQuery.questions = questions
        data = await QuizContentNew.create(dbQuery);
        if (!data) throw Error("Unable to store quiz content.Try again")
        res.status(201).send({ status: 1, message: "Quiz content added successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getQuizContentList = async (req, res, next) => {
    try {
        let {
            id,
            quizCategoryId,
            date,
            limit,
            skip,
            page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {

        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (quizCategoryId) dbQuery.quizCategoryId = quizCategoryId;
        if (date) dbQuery.date = date;
        //            $gte: `${startDate}T00:00:00.000Z`,
        //    / $lte: `${endDate}T23:59:59.000Z`
        let data = await QuizContentNew.find(dbQuery).populate([{ path: 'quizCategoryId', select: 'name icon' }]).limit(limit).skip(skip).sort({ date: -1 });
        let totalDataCount = await QuizContentNew.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Quiz content list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editQuizContent = async (req, res, next) => {
    try {
        let {
            id,
            quizCategoryId,
            content,
            date,
            questions

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id,
            quizCategoryId,
            date
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await QuizContentNew.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No quiz content found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        let dbUpdate = {};
        if (date && quizCategoryId) {
            let categoryData = await QuizCategoryNew.findOne({ _id: quizCategoryId, isDeleted: false });
            if (!categoryData) throw { status: 404, message: "No quiz category found!" }
            if (categoryData.type == "mcq" && (!questions || !questions.length)) throw { status: 400, message: "Please provide questions" }
            else if (categoryData.type == "mcq") dbQuery.questions = questions, dbUpdate.content = 1;
            if (categoryData.type == "content" && !content) throw { status: 400, message: "Please provide content" }
            else if (categoryData.type == "content") dbQuery.content = content, dbUpdate.questions = 1;
            let contentData = await QuizContentNew.findOne({ quizCategoryId, date, isDeleted: false });
            if (contentData && contentData._id.toString() != id.toString()) throw { status: 409, message: "Quiz content is already for same date and category. Try another" }
            dbQuery.date = date;
            dbQuery.quizCategoryId = quizCategoryId;
        }
        data = await QuizContentNew.findOneAndUpdate({ _id: id }, { $set: dbQuery, $unset: dbUpdate }, { new: true });
        res.status(200).send({ status: 1, message: "Quiz content edited successfully!", data })

    }
    catch (error) {
        console.log({ error })
        next(error)
    }
}

exports.deleteQuizContent = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await QuizContentNew.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        if (!data) throw { status: 404, message: "No quiz content found!" }
        res.status(200).send({ status: 1, message: "Quiz content deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
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

        let categoryData = await QuizCategoryNew.findOne({ _id: quizCategoryId, isDeleted: false });
        if (!categoryData) throw { status: 404, message: "No quiz category found!" }

        let matchDbFilters = {
            quizCategoryId: mongoose.Types.ObjectId(quizCategoryId),
            isDeleted: false
        }
        if (quizContentId) {
            let contentData = await QuizContentNew.findOne({ _id: quizContentId, isDeleted: false });
            if (!contentData) throw { status: 404, message: "No content found!" }
            matchDbFilters._id = mongoose.Types.ObjectId(quizContentId)
        }
        // if (date) matchDbFilters.date = date;

        let totalDataCount = await QuizContentNew.find(matchDbFilters).countDocuments();
        let data = await QuizContentNew.aggregate([
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
                    from: "userquizlogsnews",
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
                    isRead: 1,
                    questions: 1
                }
            },
            { $skip: skip },
            { $limit: limit }
        ])
        res.status(200).send({ status: 1, message: "Quiz content fetched successfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}

exports.readQuizContent = async (req, res, next) => {
    try {
        let quizContentId = req.body.quizContentId;
        if (!quizContentId) throw { status: 400, message: "Please provide quiz content Id" }
        let contentData = await QuizContentNew.findOne({ _id: quizContentId, isDeleted: false });
        if (!contentData) throw { status: 404, message: "No content found!" }

        let data = await UserQuizLogsNew.findOneAndUpdate(
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
