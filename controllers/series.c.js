let { Subject, User, UserCourse, Category, CourseSubjectCombination, Chapter, UserCourseUnlockCounter, UserPretestLogs,
    UserCourseTestLogs, Series, SeriesTest, UserSeriesTestLogs } = require('../models')
let { sendMobileSms, generateAge, generateReferralCode, capitalizeEveryInnerWord, generateSlotNumberWithchildSlotPosition,
    fetchChildSlotPosition, fetchNextAvailableSlotPosition, generateSlotNumber, responseJson, isRequestDataValid, shuffleArray,
    calculateAssessmentPercentage } = require('../utils/appUtils');
const { getCurrentDateAndTime, addDaysToDate, getTomorrowDate, isTrailPeriodCompleted } = require("../helpers/dates");
const mongoose = require("mongoose");
const moment = require("moment");

exports.addSeries = async (req, res, next) => {
    try {

        let {
            combinationId,
            seriesName,
            seriesNumber,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            combinationId,
            seriesName,
            seriesNumber,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let combinationData = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
        if (!combinationData) throw { status: 404, message: "No combination found!" }

        let seriesData = await Series.findOne({ seriesNumber, combinationId, isDeleted: false });
        if (seriesData) throw { status: 409, message: "Series number is already added for this combination. Try another!" }

        seriesData = await Series.create({
            seriesName: capitalizeEveryInnerWord(seriesName),
            seriesNumber,
            subjectId: combinationData.subjectId,
            courseId: combinationData.courseId,
            combinationId,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime(),
            status
        });
        if (!seriesData) throw Error("Unable to store series.Try again")
        res.status(201).send({ status: 1, message: "Series added successfully!", data: seriesData })
    }
    catch (error) {
        next(error)
    }
}

exports.getSeriesList = async (req, res, next) => {
    try {
        let {
            id,
            combinationId,
            seriesName,
            seriesNumber,
            courseId,
            subjectId,
            status,
            limit,
            skip,
            page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            combinationId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (status) dbQuery.status = status;
        if (seriesName) dbQuery.seriesName = seriesName;
        if (courseId) dbQuery.courseId = courseId;
        if (subjectId) dbQuery.subjectId = subjectId;
        if (seriesNumber) dbQuery.seriesNumber = seriesNumber;
        if (combinationId) dbQuery.combinationId = combinationId;

        let data = await Series.find(dbQuery).populate([{ path: 'subjectId', select: 'subjectName icon' }, { path: 'courseId', select: 'courseName type icon' }]).limit(limit).skip(skip).sort({ seriesNumber: 1 });
        let totalDataCount = await Series.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Series list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editSeries = async (req, res, next) => {
    try {
        let {
            id,
            combinationId,
            seriesNumber,
            seriesName,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Series.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No chapter found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status) dbQuery.status = status;
        if (seriesName) dbQuery.seriesName = capitalizeEveryInnerWord(seriesName);
        if (combinationId) {
            let combinationData = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
            if (!combinationData) throw { status: 404, message: "No combination found!" }
            dbQuery.combinationId = combinationId;
            dbQuery.courseId = combinationData.courseId;
            dbQuery.subjectId = combinationData.subjectId;
        }
        if (seriesNumber) {
            let seriesData = await Series.findOne({ seriesNumber, combinationId, isDeleted: false });
            if (seriesData && (seriesData._id).toString() !== id.toString()) throw { status: 409, message: "Series number is already for this combinationId. Try another!" }
            dbQuery.seriesNumber = seriesNumber;
        }
        data = await Series.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Series edited successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteSeries = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Series.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        if (!data) throw { status: 404, message: "No series found!" }
        res.status(200).send({ status: 1, message: "Series deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}


//*-------------------Series_test_APIS-----------------------------------------------------*/

exports.addSeriesTest = async (req, res, next) => {
    try {

        let {
            questions,
            seriesId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            questions,
            seriesId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let seriesData = await Series.findOne({ _id: seriesId, isDeleted: false });
        if (!seriesData) throw { status: 404, message: "No series found!" }

        let data = await SeriesTest.findOne({ seriesId, isDeleted: false });
        if (data) throw { status: 409, message: "Questions are already added for this series. Try for another series" }

        if (!questions.length) throw Error("Questions can not be empty.")

        data = await SeriesTest.create({
            seriesId,
            questions,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to add series test. Try again" }
        res.status(201).send({ status: 1, message: "Series test added sucessfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getSeriesTests = async (req, res, next) => {
    try {
        let {
            id,
            seriesId,
            status,
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
        if (status) dbQuery.status = status;
        if (seriesId) dbQuery.seriesId = seriesId;

        let data = await SeriesTest.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await SeriesTest.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Series tests fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editSeriesTest = async (req, res, next) => {
    try {
        let {
            id,
            seriesId, questions

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await SeriesTest.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No series test found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (seriesId) {
            let seriesData = await Series.findOne({ _id: seriesId, isDeleted: false });
            if (!seriesData) throw { status: 404, message: "No series found!" }

            let seriesTestData = await SeriesTest.findOne({ seriesId, isDeleted: false });
            if (seriesTestData && (seriesTestData._id).toString() !== id.toString()) throw { status: 409, message: "Questions are already added for this series. Try for another series" }
            dbQuery.seriesId = seriesId

        }
        if (questions) {
            if (!questions.length) throw { status: 400, message: "Questions cannot be empty." }
            dbQuery.questions = questions;
        }
        data = await SeriesTest.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Series test updated successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteSeriesTest = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);


        let data = await SeriesTest.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true } }, { new: true });
        if (!data) throw { status: 404, message: "No series test found!" }
        res.status(200).send({ status: 1, message: "Series test deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}

exports.addSeriesTestQuestions = async (req, res, next) => {
    try {
        let {
            id,
            questions

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id, questions
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await SeriesTest.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No series test found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (questions) {
            if (!questions.length) throw { status: 400, message: "Questions cannot be empty." }
            dbQuery.questions = questions;
        }
        data = await SeriesTest.findOneAndUpdate({ _id: id }, { $push: { questions } }, { new: true });
        res.status(200).send({ status: 1, message: "Questions added successfully!", data })

    }
    catch (error) {
        next(error)
    }
}


/*----------------------TEST AND SERIES API'S BY USER----------------------------------*/
exports.getSeriesListbyUser = async (req, res, next) => {
    try {
        let {
            combinationId, id,
            limit, page, skip

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            combinationId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let combinationData = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
        if (!combinationData) throw { status: 404, message: "No combination found!" }

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (combinationId) dbQuery.combinationId = combinationId;

        let data = await Series.find(dbQuery).populate([{ path: 'subjectId', select: 'subjectName icon' }, { path: 'courseId', select: 'courseName type icon' }]).limit(limit).skip(skip).sort({ seriesNumber: 1 });
        let totalDataCount = await Series.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Series list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}

exports.getSeriesTestByUser = async (req, res, next) => {
    try {
        let {
            seriesId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            seriesId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        let user = req.user;
        console.log({ user })
        let data = await SeriesTest.findOne({ seriesId, isDeleted: false }).populate([{ path: 'seriesId', select: 'seriesName seriesNumber combinationId' }]);
        if (!data) throw { status: 404, message: "No assessment found!" }
        if (user.status != 3 && user.status != 4) {
            let totalAttemptsCount = await UserSeriesTestLogs.find({ seriesTestId: data._id, isDeleted: false }).countDocuments();
            console.log({ totalAttemptsCount })
            if (totalAttemptsCount >= 5) throw { status: 402, message: "Please purchase the plan to take the test series." }
        }
        data = JSON.parse(JSON.stringify(data));
        data.questions = (shuffleArray(data.questions)).slice(0, 40);
        res.status(200).send({ status: 1, message: "Series Test fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.submitSeriesTest = async (req, res, next) => {
    try {
        let {
            seriesTestId,
            responses

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            seriesTestId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        let user = req.user;
        let data = await SeriesTest.findOne({ _id: seriesTestId, isDeleted: false }).populate([{ path: 'seriesId', select: 'seriesName seriesNumber combinationId' }]);
        if (!data) throw { status: 404, message: "No test found!" }
        if (user.status != 3 && user.status != 4) {
            let totalAttemptsCount = await UserSeriesTestLogs.find({ seriesTestId, isDeleted: false }).countDocuments();
            if (totalAttemptsCount >= 5) throw { status: 402, message: "Please purchase the plan to access assessments." }
        }
        if (!responses.length) throw { status: 404, message: "No responses found!" }
        responses = Array.from(new Map(responses.map(obj => [obj.questionId, obj])).values());
        let commonQuestions = (data.questions).filter(question =>
            responses.some(response => (response.questionId).toString() == (question._id).toString()));
        let calculatedData = calculateAssessmentPercentage(commonQuestions, responses, 40);
        let percentage = calculatedData.percentage;
        responses = calculatedData.responses;

        let seriesTestLogData = await UserSeriesTestLogs.create({
            userId: req.user._id,
            responses,
            seriesTestId,
            seriesId: data.seriesId._id,
            combinationId: data.seriesId.combinationId,
            percentage,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!seriesTestLogData) throw { status: 500, message: "Unable to submit test. Please try again" }
        seriesTestLogData = JSON.parse(JSON.stringify(seriesTestLogData));
        delete seriesTestLogData.responses;
        res.status(200).send({ status: 1, message: "Series Test fetched successfully!", seriesTestLogData })
    }
    catch (error) {
        console.log({ error })
        next(error)
    }
}
