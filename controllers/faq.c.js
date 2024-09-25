let { User, UserCourse, Category, Role, Otp, Course, WalletHistory, EndorsedUsers, Payment, Faq } = require('../models')
let { sendMobileSms, generateAge, generateReferralCode, capitalizeEveryInnerWord, generateSlotNumberWithchildSlotPosition,
    fetchChildSlotPosition, fetchNextAvailableSlotPosition, generateSlotNumber, responseJson, isRequestDataValid } = require('../utils/appUtils');
const { getCurrentDateAndTime, addDaysToDate } = require("../helpers/dates");

exports.createFaq = async (req, res, next) => {
    try {
        let {
            question, answer
        } = Object.assign(req.body)

        const requiredFields = {
            question, answer
        }

        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Faq.create({
            question, answer, status: 1,
            createdAt: getCurrentDateAndTime(), updatedAt: getCurrentDateAndTime()
        })
        res.status(200).send({ status: 1, message: "Faq created successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchFaqs = async (req, res, next) => {
    try {
        let {
            question, answer, id,
            limit, page, skip
        } = Object.assign(req.query)

        //Paginations
        limit = limit ? parseInt(limit) : 50;
        page = page ? parseInt(page) : 1;
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = {};
        if (question) dbQuery.question = question;
        if (answer) dbQuery.answer = answer;
        if (id) dbQuery._id = id;

        let data = await Faq.find(dbQuery).sort({ createdAt: 1 }).limit(limit).skip(skip).lean();
        let totalDataCount = await Faq.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Faqs fetched sucecssfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}

exports.editFaq = async (req, res, next) => {
    try {

        let {
            question, answer, status, id
        } = Object.assign(req.body)

        const requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        let updateBody = { updatedAt: getCurrentDateAndTime() }
        if (question) updateBody.question = question;
        if (answer) updateBody.answer = answer;
        if (status == 0 || status == 1) updateBody.status = status;
        let data = await Faq.findOneAndUpdate({ _id: id }, { $set: updateBody }, { new: true })
        if (!data) throw { statusCode: 404, message: "No faq found" }

        res.status(200).send({ status: 1, message: "Faq updated successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.deleteFaq = async (req, res, next) => {
    try {

        let {
            id
        } = Object.assign(req.query)

        const requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Faq.findOne({ _id: id })
        if (!data) throw { statusCode: 404, message: "No faq found" }
        data = await Faq.findOneAndDelete({ _id: id })
        res.status(200).send({ status: 1, message: "Faq deleted successfully!", data: {} })
    }
    catch (error) {
        next(error)
    }
}