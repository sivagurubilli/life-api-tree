let { Subject, User, UserCourse, Category, Role, Otp, Course, WalletHistory, EndorsedUsers, Payment, Faq, CourseSubjectCombination } = require('../models')
let { sendMobileSms, generateAge, generateReferralCode, capitalizeEveryInnerWord, generateSlotNumberWithchildSlotPosition,
    fetchChildSlotPosition, fetchNextAvailableSlotPosition, generateSlotNumber, responseJson, isRequestDataValid } = require('../utils/appUtils');
const { getCurrentDateAndTime, addDaysToDate } = require("../helpers/dates");

exports.addSubject = async (req, res, next) => {
    try {

        let {
            subjectName,
            icon,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            subjectName,
            icon,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Subject.create({
            subjectName: capitalizeEveryInnerWord(subjectName),
            icon,
            status,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw Error("Unable to store Subject.Try again")
        res.status(201).send({ status: 1, message: "Subject added sucessfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getSubject = async (req, res, next) => {
    try {
        let {
            id,
            subjectName,
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
        if (subjectName) dbQuery.subjectName = subjectName;

        let data = await Subject.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await Subject.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Subjects fetched sucessfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}


exports.editSubject = async (req, res, next) => {
    try {
        let {
            id,
            subjectName,
            status,
            icon

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Subject.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No subject found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status == 0 || status == 1) dbQuery.status = status;
        if (subjectName) dbQuery.subjectName = capitalizeEveryInnerWord(subjectName);
        if (icon) dbQuery.icon = icon;
        data = await Subject.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Subject updated sucessfully!", data })

    }
    catch (error) {
        next(error)
    }
}


exports.deleteSubject = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Subject.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No subject found!" }

        data = await Subject.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        res.status(200).send({ status: 1, message: "Subject deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}

//Course-Subject-Combination
exports.addCourseSubjectCombination = async (req, res, next) => {
    try {

        let {
            courseId,
            subjectId,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            courseId,
            subjectId,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let courseData = await Course.findOne({ _id: courseId, isDeleted: false });
        if (!courseData) throw { status: 404, message: "No course found!" }

        let subjectData = await Subject.findOne({ _id: subjectId, isDeleted: false });
        if (!subjectData) throw { status: 404, message: "No subject found!" }

        let combinationData = await CourseSubjectCombination.findOne({ subjectId, courseId, isDeleted: false });
        if (combinationData) throw { status: 409, message: "This combination is already exists. Try another one" }

        let data = await CourseSubjectCombination.create({
            subjectId, courseId, status, createdAt: getCurrentDateAndTime(), updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw Error("Unable to add combination.Try again")
        res.status(201).send({ status: 1, message: "Combination added sucessfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getCourseSubjectCombination = async (req, res, next) => {
    try {
        let {
            id,
            subjectId,
            courseId,
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
        if (courseId) dbQuery.courseId = courseId;
        if (subjectId) dbQuery.subjectId = subjectId;

        let data = await CourseSubjectCombination.find(dbQuery).populate([{ path: "courseId" }, { path: "subjectId" }]).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await CourseSubjectCombination.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Combinations fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editCourseSubjectCombination = async (req, res, next) => {
    try {
        let {
            id,
            courseId,
            subjectId,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status) dbQuery.status = status;

        let data = await CourseSubjectCombination.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No combination found!" }

        if (courseId && subjectId) {
            let combinationData = await CourseSubjectCombination.findOne({ subjectId, courseId, isDeleted: false });
            if (combinationData && (combinationData._id).toString() != id.toString()) throw { status: 409, message: "This combination is already existed earlier. Try another one!" }
        }

        if (courseId) {
            let courseData = await Course.findOne({ _id: courseId, isDeleted: false });
            if (!courseData) throw { status: 404, message: "No course found!" }
            dbQuery.courseId = courseId;
        }

        if (subjectId) {
            let subjectData = await Subject.findOne({ _id: subjectId, isDeleted: false });
            if (!subjectData) throw { status: 404, message: "No subject found!" }
            dbQuery.subjectId = subjectId;
        }

        data = await CourseSubjectCombination.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Combination edited successfully!", data })

    }
    catch (error) {
        next(error)
    }
}


exports.deleteCourseSubjectCombination = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await CourseSubjectCombination.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No combination found!" }

        data = await CourseSubjectCombination.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        res.status(200).send({ status: 1, message: "Combination deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}