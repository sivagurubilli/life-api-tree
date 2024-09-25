let { Subject, User, UserCourse, Category, Role, Otp, Course, WalletHistory, EndorsedUsers, Unit, UserMaterialLogs, UserFinaltestLogs,
    Payment, Faq, CourseSubjectCombination, Chapter, Material, PreTest, FinalTest, UserCourseUnlockCounter, UserPretestLogs,
    UserCourseTestLogs, UserChallenges, UserAssessmentLogs, Assessment, Challenges, UserActivityLogs, ChallengeWinners } = require('../models')
let { sendMobileSms, generateAge, generateReferralCode, capitalizeEveryInnerWord, generateSlotNumberWithchildSlotPosition,
    fetchChildSlotPosition, fetchNextAvailableSlotPosition, generateSlotNumber, responseJson, isRequestDataValid, shuffleArray,
    calculateAssessmentPercentage, generateRanksForLeaderBoard, generateActivitiesLeaderBoard, generateReferralLeaderBoard, generateAssessmentLeaderBoard,
    applyPagination } = require('../utils/appUtils');
const { getCurrentDateAndTime, addDaysToDate, getTomorrowDate, isTrailPeriodCompleted, getDaysDifference, getCurrentDate } = require("../helpers/dates");
const mongoose = require("mongoose");
const moment = require("moment");

exports.addChapter = async (req, res, next) => {
    try {

        let {
            combinationId,
            chapterName,
            chapterNumber,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            combinationId,
            chapterName,
            chapterNumber,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let combinationData = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
        if (!combinationData) throw { status: 404, message: "No combination found!" }

        let chapterData = await Chapter.findOne({ chapterNumber, combinationId, isDeleted: false });
        if (chapterData) throw { status: 409, message: "Chapter number is already added for this combination. Try another!" }

        chapterData = await Chapter.create({
            chapterName: capitalizeEveryInnerWord(chapterName),
            chapterNumber,
            subjectId: combinationData.subjectId,
            courseId: combinationData.courseId,
            combinationId,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime(),
            status
        });
        if (!chapterData) throw Error("Unable to store chapter.Try again")
        res.status(201).send({ status: 1, message: "Chapter added successfully!", data: chapterData })
    }
    catch (error) {
        next(error)
    }
}

exports.getChapters = async (req, res, next) => {
    try {
        let {
            id,
            combinationId,
            chapterName,
            chapterNumber,
            courseId,
            subjectId,
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
        if (chapterName) dbQuery.chapterName = chapterName;
        if (courseId) dbQuery.courseId = courseId;
        if (subjectId) dbQuery.subjectId = subjectId;
        if (chapterNumber) dbQuery.chapterNumber = chapterNumber;
        if (combinationId) dbQuery.combinationId = combinationId;

        let data = await Chapter.find(dbQuery).populate([{ path: 'subjectId', select: 'subjectName icon' }, { path: 'courseId', select: 'courseName type icon' }]).limit(limit).skip(skip).sort({ chapterNumber: 1 });
        let totalDataCount = await Chapter.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Chapters fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editChapter = async (req, res, next) => {
    try {
        let {
            id,
            combinationId,
            chapterNumber,
            chapterName,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Chapter.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No chapter found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status) dbQuery.status = status;
        if (chapterName) dbQuery.chapterName = capitalizeEveryInnerWord(chapterName);
        if (combinationId) {
            let combinationData = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
            if (!combinationData) throw { status: 404, message: "No combination found!" }
            dbQuery.combinationId = combinationId;
            dbQuery.courseId = combinationData.courseId;
            dbQuery.subjectId = combinationData.subjectId;
        }
        if (chapterNumber) {
            let chapterData = await Chapter.findOne({ chapterNumber, combinationId });
            if (chapterData && (chapterData._id).toString() !== id.toString()) throw { status: 409, message: "Chapter number is already for this combinationId. Try another!" }
            dbQuery.chapterNumber = chapterNumber;
        }
        data = await Chapter.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Chapter edited successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteChapter = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Chapter.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No chapter found!" }

        data = await Chapter.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        res.status(200).send({ status: 1, message: "Chapter deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}

exports.getChaptersByCombinationId = async (req, res) => {
    try {
        let {
            id,
            combinationId,
            userId,
            chapterName,
            chapterNumber,
            courseId,
            subjectId,
            status,
            limit,
            skip,
            page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            combinationId,
            userId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let [userData, isSubscribed] = await Promise.all([
            checkValidUser({ userId }),
            isActiveSubscriber({ userId })
        ])

        if (!isSubscribed) throw Error("Please subscribe our plans first")


        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (status) dbQuery.status = status;
        if (chapterName) dbQuery.chapterName = chapterName;
        if (courseId) dbQuery.courseId = courseId;
        if (subjectId) dbQuery.subjectId = subjectId;
        if (chapterNumber) dbQuery.chapterNumber = chapterNumber;
        if (combinationId) dbQuery.combinationId = combinationId;

        let data = await Chapter.find(dbQuery).populate([{ path: 'subjectId', select: 'subjectName icon' }, { path: 'courseId', select: 'courseName type icon' }]).limit(limit).skip(skip).sort({ chapterNumber: 1 });
        res.status(200).send(responseJson(1, data, 'Chapters fetch success', {}, data.length))

    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Chapters fetch failed', e))
    }
}

//Unit-APIS
exports.addUnit = async (req, res, next) => {
    try {

        let {
            chapterId,
            unitNumber,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            chapterId,
            unitNumber,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let chapterData = await Chapter.findOne({ _id: chapterId, isDeleted: false });
        if (!chapterData) throw { status: 404, message: "No chapter found!" }

        let unitData = await Unit.findOne({ unitNumber, chapterId, isDeleted: false });
        if (unitData) throw { status: 409, messag: "Unit number is already taken for this chapter. Try another!" }

        unitData = await Unit.create({
            unitNumber,
            chapterId,
            status,
            subjectId: chapterData.subjectId,
            courseId: chapterData.courseId,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!unitData) throw Error("Unable to store unit.Try again")
        res.status(201).send({ status: 1, message: "Unit added successfully.", data: unitData })
    }
    catch (error) {
        next(error)
    }
}

exports.getUnits = async (req, res, next) => {
    try {
        let {
            id,
            unitNumber,
            chapterId,
            courseId,
            subjectId,
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
        if (chapterId) dbQuery.chapterId = chapterId;
        if (courseId) dbQuery.courseId = courseId;
        if (subjectId) dbQuery.subjectId = subjectId;
        if (unitNumber) dbQuery.unitNumber = unitNumber;

        let data = await Unit.find(dbQuery).populate([{ path: 'chapterId', select: 'chapterName chapterNumber' }, { path: 'subjectId', select: 'subjectName icon' }, { path: 'courseId', select: 'courseName type icon' }]).limit(limit).skip(skip).sort({ unitNumber: 1 });
        let totalDataCount = await Unit.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Units fetched successfully", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editUnits = async (req, res, next) => {
    try {
        let {
            id,
            chapterId,
            unitNumber,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Unit.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No unit found." }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status) dbQuery.status = status;
        if (chapterId) {
            let chapterData = await Chapter.findOne({ _id: chapterId, isDeleted: false });
            if (!chapterData) throw { status: 404, message: "No chapter found." }
            dbQuery.chapterId = chapterId;
        }
        if (unitNumber) {
            let unitData = await Unit.findOne({ unitNumber });
            if (unitData && (unitData._id).toString() !== id.toString()) throw { status: 409, message: "unitNumber is already taken for this chapter. Try another!" }
            dbQuery.unitNumber = unitNumber;
        }
        data = await Unit.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Unit edited successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteUnit = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Unit.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No unit found." }

        data = await Unit.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        res.status(200).send({ status: 1, message: "Unit deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}

/*-------------------------------------MATERIAL-APIS----------------------------*/
exports.addMaterial = async (req, res, next) => {
    try {

        let {
            materialName,
            materialNumber,
            description,
            unitId,
            materialUrl,
            status,
            type

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            materialName,
            materialNumber,
            unitId,
            type,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false });
        if (!unitData) throw { status: 404, message: "No unit found!" }

        let data = await Material.findOne({ unitId, materialNumber, isDeleted: false });
        if (data) throw { status: 409, message: "Material number is already used for this unit" }

        data = await Material.create({
            materialName: capitalizeEveryInnerWord(materialName),
            materialNumber,
            description,
            unitId,
            materialUrl,
            status,
            type,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Fundamental material adding failed. Try again" }
        res.status(201).send({ status: 1, message: "Material added successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getMaterials = async (req, res, next) => {
    try {
        let {
            materialName,
            unitId,
            type,
            materialNumber,
            status,
            id,
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
        if (unitId) dbQuery.unitId = unitId;
        if (materialName) dbQuery.materialName = materialName;
        if (type) dbQuery.type = type;
        if (materialNumber) dbQuery.materialNumber = materialNumber;

        let data = await Material.find(dbQuery).populate([{ path: "unitId" }]).limit(limit).skip(skip).sort({ 'materialNumber': 1 });
        let totalDataCount = await Material.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Materials list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editMaterial = async (req, res, next) => {
    try {
        let {
            id,
            materialName,
            unitId,
            materialUrl,
            materialNumber,
            description,
            type,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Material.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No material found." }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status != undefined && status != null) dbQuery.status = status;
        if (description) dbQuery.description = description;
        if (materialName) dbQuery.materialName = capitalizeEveryInnerWord(materialName);
        if (materialUrl) dbQuery.materialUrl = materialUrl;
        if (type) dbQuery.type = type;
        if (unitId) {
            let unitData = await Unit.findOne({ _id: unitId, isDeleted: false });
            if (!unitData) throw { status: 404, message: "No unit found!" }
            dbQuery.unitId = unitId;
        }
        if (materialNumber) {
            let unitid = (unitId) ? unitId : data.unitId;
            let matData = await Material.findOne({ unitId: unitid, materialNumber, isDeleted: false });
            if (matData && (matData._id).toString() != id.toString()) throw { status: 409, message: "Material number is already taken for this unit" }
            dbQuery.materialNumber = materialNumber;

        }
        data = await Material.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Material updated sucessfully!", data })

    }
    catch (error) {
        next(error)
    }
}


exports.deleteMaterial = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Material.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Material deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}


exports.saveFundamentalMaterialLog = async (req, res, next) => {
    try {
        let unitId = req.body.unitId;
        let userId = req.user._id;
        if (!unitId) throw { status: 400, message: "Please provide unitId." }

        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.subjectId })
        if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
        if (unitLogsData) {
            if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please complete previous chapter to unlock this chapter." }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }

                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString() != "64ed9453511b7d753021d3cb")) throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
            }
        }

        let data = await UserFundamentalMaterialLogs.findOne({ userId, unitId });
        let updateBody = {
            userId,
            unitId,
            updatedAt: getCurrentDateAndTime()
        }
        if (!data) updateBody.createdAt = getCurrentDateAndTime();
        data = await UserFundamentalMaterialLogs.findOneAndUpdate({ userId, unitId }, { $set: updateBody }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).send({ status: 1, message: "Material log saved successfully!", data })

    }
    catch (error) {
        next(error)
    }
}


/*-----------------------------------------Pretest-APIS----------------------------------------------*/

exports.addPretest = async (req, res, next) => {
    try {

        let {
            questions,
            isPretestMandatory,
            unitId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            questions,
            unitId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false });
        if (!unitData) throw { status: 404, message: "No unit found!" }

        let data = await PreTest.findOne({ unitId, isDeleted: false });
        if (data) throw { status: 409, message: "Questions are already added for this unit. Try for another unit" }

        if (!questions.length) throw { status: 400, message: "Questions cannot be empty" }

        data = await PreTest.create({
            unitId,
            questions,
            isPretestMandatory,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to add pretest. Try again" }
        res.status(201).send({ status: 1, message: "Pretest added sucessfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getPretests = async (req, res, next) => {
    try {
        let {
            id,
            unitId,
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
        if (unitId) dbQuery.unitId = unitId;

        let data = await PreTest.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await PreTest.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Pretests fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editPretest = async (req, res, next) => {
    try {
        let {
            id,
            unitId, questions, isPretestMandatory

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await PreTest.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No pretest found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (unitId) {
            let unitData = await Unit.findOne({ _id: unitId, isDeleted: false });
            if (!unitData) throw { status: 404, message: "No unit found!" }

            let unitTestData = await PreTest.findOne({ unitId, isDeleted: false });
            if (unitTestData && (unitTestData._id).toString() !== id.toString()) throw { status: 409, message: "Questions are already added for this unit. Try for another unit" }
            dbQuery.unitId = unitId
        }
        if (questions && !questions.length) throw { status: 400, message: "Questions cannot be empty." }
        dbQuery.questions = questions
        if (isPretestMandatory == true || isPretestMandatory == false) dbQuery.isPretestMandatory = isPretestMandatory;
        data = await PreTest.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Pretest updated successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.deletePretest = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await PreTest.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No pretest found!" }

        data = await PreTest.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Pretest deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}
//9353891277 Tejas


//*-------------------Final_test_APIS-----------------------------------------------------*/

exports.addFinaltest = async (req, res, next) => {
    try {

        let {
            questions,
            unitId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            questions,
            unitId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false });
        if (!unitData) throw { status: 404, message: "No unit found!" }

        let data = await FinalTest.findOne({ unitId, isDeleted: false });
        if (data) throw { status: 409, message: "Questions are already added for this unit. Try for another unit" }

        if (!questions.length) throw Error("Questions can not be empty.")

        data = await FinalTest.create({
            unitId,
            questions,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to add finaltest. Try again" }
        res.status(201).send({ status: 1, message: "Finaltest added sucessfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getFinaltests = async (req, res, next) => {
    try {
        let {
            id,
            unitId,
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
        if (unitId) dbQuery.unitId = unitId;

        let data = await FinalTest.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await FinalTest.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "FinalTests fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editFinaltest = async (req, res, next) => {
    try {
        let {
            id,
            unitId, questions, isPretestMandatory

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FinalTest.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No finaltest found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (unitId) {
            let unitData = await Unit.findOne({ _id: unitId, isDeleted: false });
            if (!unitData) throw { status: 404, message: "No unit found!" }

            let unitTestData = await FinalTest.findOne({ unitId, isDeleted: false });
            if (unitTestData && (unitTestData._id).toString() !== id.toString()) throw { status: 409, message: "Questions are already added for this unit. Try for another unit" }
            dbQuery.unitId = unitId

        }
        if (questions) {
            if (!questions.length) throw { status: 400, message: "Questions cannot be empty." }
            dbQuery.questions = questions;
        }
        data = await FinalTest.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Finaltest updated successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteFinaltest = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FinalTest.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No finaltest found!" }

        data = await FinalTest.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Finaltest deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}

//User-Course-APIS
exports.getUserSubscribedCoursesList = async (req, res, next) => {
    try {

        let {
            courseId,
            subjectId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let userId = req.user._id;

        let data = await UserCourse.aggregate([
            {
                $match: { userId: mongoose.Types.ObjectId(userId), isDeleted: false },
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: '_id',
                    as: 'course',
                },
            },
            {
                $unwind: '$course',
            },
            {
                $lookup: {
                    from: 'coursesubjectcombinations',
                    localField: 'course._id',
                    foreignField: 'courseId',
                    as: 'subjectCombinations',
                },
            },
            {
                $unwind: {
                    path: '$subjectCombinations',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    'subjectCombinations.isDeleted': false
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subjectCombinations.subjectId',
                    foreignField: '_id',
                    as: 'subject',
                },
            },
            {
                $unwind: {
                    path: '$subject',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    'subject.isDeleted': false
                }
            },
            {
                $group: {
                    _id: '$_id',
                    userEnrolledCourse: { $first: '$_id' },
                    course: { $first: '$course' },
                    subjects: {
                        $addToSet: {
                            $cond: {
                                if: { $eq: ['$subject', null] },
                                then: '$$REMOVE',
                                else: {
                                    _id: '$subject._id',
                                    subjectName: '$subject.subjectName',
                                    icon: '$subject.icon',
                                    created_at: '$subject.created_at',
                                    updated_at: '$subject.updated_at',
                                    status: '$subject.status',
                                    isDeleted: '$subject.isDeleted',
                                    courseSubjectCombinationId: '$subjectCombinations._id',
                                    courseId: '$subjectCombinations.courseId',
                                    totalChaptersCount: 0
                                },
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    userEnrolledCourse: 1,
                    course: 1,
                    subjects: {
                        $filter: {
                            input: '$subjects',
                            as: 'subject',
                            cond: { $ne: ['$$subject', []] },
                        },
                    },
                },
            },
            {
                $unwind: '$subjects',
            },
            {
                $lookup: {
                    from: 'chapters',
                    let: { combinationId: '$subjects.courseSubjectCombinationId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$combinationId', '$$combinationId'] },
                                isDeleted: false
                            },
                        },
                        {
                            $count: 'totalChaptersCount'
                        }
                    ],
                    as: 'chapterCount',
                },
            },
            {
                $addFields: {
                    'subjects.totalChaptersCount': { $ifNull: [{ $arrayElemAt: ['$chapterCount.totalChaptersCount', 0] }, 0] } // Add totalChaptersCount for each subject
                }
            },
            {
                $group: {
                    _id: '$userEnrolledCourse',
                    userEnrolledCourse: { $first: '$userEnrolledCourse' },
                    course: { $first: '$course' },
                    subjects: { $addToSet: '$subjects' },
                },
            },
            {
                $sort: { 'course.courseName': 1 }
            }
        ])
        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            data = data.map((x) => {
                if (x.subjects && x.subjects.length) {
                    (x.subjects).sort((a, b) => {
                        return a.subjectName.localeCompare(b.subjectName);
                    });
                    return x;
                }
            })
        }
        res.status(200).send({ status: 1, message: "Subscribed courses fetched successfully!", totalDataCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}

//
exports.getChaptersListByUser = async (req, res, next) => {
    try {

        let combinationId = req.query.combinationId;
        if (!combinationId) throw { status: 400, message: "Please provide combinationId." }
        let userId = req.user._id;

        let aggregateQuery = [];

        if (combinationId) {
            let data = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
            if (!data) throw { status: 404, message: "No combination found!" }

            //Filters_attaching
            aggregateQuery.push({
                $match: { _id: mongoose.Types.ObjectId(combinationId) },
            },)
        }

        aggregateQuery.push(
            {
                $lookup: {
                    from: 'chapters',
                    localField: '_id',
                    foreignField: 'combinationId',
                    as: 'chapters',
                },
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    isDeleted: 1,
                    subjectId: 1,
                    courseId: 1,
                    chapters: {
                        $filter: {
                            input: "$chapters",
                            as: "chapter",
                            cond: { $eq: ["$$chapter.isDeleted", false] }
                        }
                    }
                }
            }
        )

        data = await CourseSubjectCombination.aggregate(aggregateQuery);
        data = JSON.parse(JSON.stringify(data))

        // Checking_Lock_features_For_User_Based_On_SubjecIdCombinationId
        if (combinationId && data.length && data[0].chapters && data[0].chapters.length) {
            let chapters = data[0].chapters;
            let countersData = await UserCourseUnlockCounter.findOne({ userId, combinationId });
            if (!countersData) {
                chapters = chapters.map((x) => {
                    x.isLocked = (x.chapterNumber == 1) ? false : true; return x;
                })
            }
            else if (countersData) {
                chapters = chapters.map((x) => {
                    if (x.chapterNumber == 1) x.isLocked = false;
                    if (x.chapterNumber < countersData.nextUnlockedChapterNumber) x.isLocked = false;
                    if (x.chapterNumber > countersData.nextUnlockedChapterNumber) x.isLocked = false;
                    if (x.chapterNumber != 1 && x.chapterNumber == countersData.nextUnlockedChapterNumber) {
                        if (userId.toString() == "64ed9453511b7d753021d3cb" || new Date(getCurrentDateAndTime()) >= new Date(countersData.nextUnlockDate)) x.isLocked = false
                    }
                    if (x.chapterNumber != 1 && x.chapterNumber == countersData.nextUnlockedChapterNumber) {
                        if (userId.toString() == "64ed9453511b7d753021d3cb" && new Date(getCurrentDateAndTime()) < new Date(countersData.nextUnlockDate)) x.isLocked = false;
                    }
                    return x;
                })
            }
            data[0].chapters = chapters;
        }
        res.status(200).send({ status: 1, message: "Chapters fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchUnitsListByUser = async (req, res, next) => {
    try {
        let {
            id,
            unitNumber,
            chapterId,
            subjectId,
            status,
            limit,
            skip,
            page,
            chapterData

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            chapterId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        const userId = req.user._id;


        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (status) dbQuery.status = status;
        if (chapterId) {
            chapterData = await Chapter.findOne({ _id: chapterId, isDeleted: false });
            if (!chapterData) throw { status: 404, message: "No chapter found!" }
            dbQuery.chapterId = chapterId;
        }
        if (subjectId) dbQuery.subjectId = subjectId;
        if (unitNumber) dbQuery.unitNumber = unitNumber;

        let totalDataCount = await Unit.find(dbQuery).countDocuments();
        let data = await Unit.find(dbQuery).populate([{ path: 'chapterId', select: 'chapterName chapterNumber' }, { path: 'subjectId', select: 'subjectName icon' }]).limit(limit).skip(skip).sort({ unitNumber: 1 });
        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            let unitLogsData = await UserCourseUnlockCounter.findOne({ userId, subjectId: chapterData.subjectId, combinationId: chapterData.combinationId })

            if (!unitLogsData) {
                if (chapterData.chapterNumber != 1) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
                data.map(async (x) => {
                    if (chapterData.chapterNumber == 1 && x.unitNumber == 1) x.isLocked = false;
                    if (chapterData.chapterNumber == 1 && x.unitNumber != 1) x.isLocked = true;
                    if (chapterData.chapterNumber != 1) x.isLocked = true;
                    return x;
                })
            }
            if (unitLogsData) {
                if (unitLogsData.nextUnlockedChapterNumber < chapterData.chapterNumber) throw { status: 403, message: "Please complete previous chapter to unlock this chapter." }
                if (chapterData.chapterNumber > 1 && req.user.status != 3 && req.user.status != 4) throw { status: 402, message: "To continue learning please subscribe!" }
                data.map(async (x) => {
                    if (chapterData.chapterNumber > unitLogsData.nextUnlockedChapterNumber) x.isLocked = true;
                    if (chapterData.chapterNumber < unitLogsData.nextUnlockedChapterNumber) x.isLocked = false;
                    if (chapterData.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                        if (x.unitNumber < unitLogsData.nextUnlockedUnitNumber) x.isLocked = false;
                        if (x.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) >= new Date(unitLogsData.nextUnlockDate)) x.isLocked = false;
                        if (x.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) x.isLocked = true;
                        if (x.unitNumber == unitLogsData.nextUnlockedUnitNumber && (userId.toString()) == "64ed9453511b7d753021d3cb") x.isLocked = false;
                        if (x.unitNumber > unitLogsData.nextUnlockedUnitNumber) x.isLocked = true;
                    }
                    return x;
                })
            }
        }
        res.status(200).send({ status: 1, message: "Units list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        console.log({ error })
        next(error)
    }
}


exports.getUnitDetailsByUser = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let id = req.query.unitId;
        if (!id) throw { status: 400, message: "Please provide unit id" };

        let unitData = await Unit.findOne({ _id: id, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId combinationId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }

        console.log({ trail: isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt) })

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserCourseUnlockCounter.findOne({ userId, subjectId: unitData.subjectId, combinationId: unitData.chapterId.combinationId })
        if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
        if (!unitLogsData && (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
        if (unitLogsData) {
            if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please complete previous chapter to unlock this chapter." }
            if (unitData.chapterId.chapterNumber > 1 && req.user.status != 3 && req.user.status != 4) throw { status: 402, message: "To continue learning please subscribe!" }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString()) != "64ed9453511b7d753021d3cb") throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }
                if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 500, message: "Please complete previous unit to unlock this unit." }
            }
        }

        //After_Having_UnitAccess
        let [ materials, finaltestData, userUnlocksData] = await Promise.all([
            Material.find({ unitId: id, isDeleted: false }).sort({ 'materialNumber': 1 }),
            FinalTest.findOne({ unitId: id, isDeleted: false }),
            UserCourseUnlockCounter.findOne({ userId, subjectId: unitData.chapterId.subjectId, combinationId: unitData.chapterId.combinationId })

        ]);
        if (!pretestData) throw { status: 404, message: "Pre test is not yet added for this unit" }
        if (!materials.length) throw { status: 404, message: "Material is not yet added for this unit" }
        if (!finaltestData) throw { status: 404, message: "Final test is not yet added for this unit" }

        let [materialLogsData, pretestLogsData, finaltestLogsData] = await Promise.all([
            UserMaterialLogs.findOne({ unitId: id, isDeleted: false, userId }),
            UserPretestLogs.findOne({ userId, unitId: id, testId: pretestData._id }),
            UserFinaltestLogs.findOne({ userId, unitId: id, testId: finaltestData._id })
        ]);
        materials = JSON.parse(JSON.stringify(materials));
        finaltestData = JSON.parse(JSON.stringify(finaltestData));
        let materialData = { materials };

        if (!userUnlocksData) {
            if (unitData.chapterId.chapterNumber == 1 && unitData.unitNumber == 1) pretestData.isLocked = false, materialData.isLocked = false, finaltestData.isLocked = (materialLogsData) ? false : true;
            if (unitData.chapterId.chapterNumber != 1 || unitData.unitNumber != 1) pretestData.isLocked = true, materialData.isLocked = true, finaltestData.isLocked = true;
        }
        if (userUnlocksData) {
            if (unitData.chapterId.chapterNumber > userUnlocksData.nextUnlockedChapterNumber) pretestData.isLocked = true, materialData.isLocked = true, finaltestData.isLocked = true;
            if (unitData.chapterId.chapterNumber <= userUnlocksData.nextUnlockedChapterNumber && unitData.unitNumber < userUnlocksData.nextUnlockedUnitNumber) pretestData.isLocked = false, materialData.isLocked = false, finaltestData.isLocked = (materialLogsData) ? false : true;
            if (unitData.chapterId.chapterNumber == userUnlocksData.nextUnlockedChapterNumber && unitData.unitNumber == userUnlocksData.nextUnlockedUnitNumber) {
                if (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
                else pretestData.isLocked = false, materialData.isLocked = false, finaltestData.isLocked = (materialLogsData) ? false : true;
            }
            if (unitData.chapterId.chapterNumber == userUnlocksData.nextUnlockedChapterNumber && unitData.unitNumber > userUnlocksData.nextUnlockedUnitNumber) pretestData.isLocked = true, materialData.isLocked = true, finaltestData.isLocked = (materialLogsData) ? false : true;
        }

        finaltestData.questions = (shuffleArray(finaltestData.questions)).slice(0, 10);
        res.status(200).send({ status: 1, message: "Unit details fetched sucessfully!", data: {  materialData, finaltestData } })
    }
    catch (error) {
        next(error)
    }
}

exports.saveMaterialLog = async (req, res, next) => {
    try {
        let unitId = req.body.unitId;
        let userId = req.user._id;
        let userStatus = req.user.status;
        let expiryDate = req.user.planExpiresAt;

        if (!unitId) throw { status: 400, message: "Please provide unitId." }
        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId combinationId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }


        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserCourseUnlockCounter.findOne({ userId, subjectId: unitData.subjectId, combinationId: unitData.chapterId.combinationId })
        // if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
        if (!unitLogsData && (userStatus == 2 || (userStatus == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), expiryDate)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
        if (unitLogsData) {
            // if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please complete previous chapter to unlock this chapter." }
            if (unitData.chapterId.chapterNumber > 1 && req.user.status != 3 && req.user.status != 4) throw { status: 402, message: "To continue learning please subscribe!" }
            // if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
            //     if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString() != "64ed9453511b7d753021d3cb")) throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
            //     if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && (userStatus == 2 || (userStatus == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), expiryDate)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
            //     if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
            // }
        }

        let data = await UserMaterialLogs.findOne({ userId, unitId });
        let updateBody = {
            userId,
            unitId,
            updatedAt: getCurrentDateAndTime()
        }
        if (!data) updateBody.createdAt = getCurrentDateAndTime();
        console.log("coming")
        data = await UserMaterialLogs.findOneAndUpdate({ userId, unitId }, { $set: updateBody }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).send({ status: 1, message: "Material log saved successfully!", data })

    }
    catch (error) {
        console.log({ error })
        next(error)
    }
}


exports.submitPretest = async (req, res, next) => {
    try {

        let {
            testId,
            unitId,
            responses,
            maxPercentage

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            testId,
            unitId,
            responses
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        const userId = req.user._id;

        let testData = await PreTest.findOne({ _id: testId, isDeleted: false });
        if (!testData) throw { status: 404, message: "No pretest found!" }

        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }


        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserCourseUnlockCounter.findOne({ userId, subjectId: unitData.subjectId, combinationId: unitData.chapterId.combinationId })
        // if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
        if (!unitLogsData && (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }

        if (unitLogsData) {
            // if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please complete previous chapter to unlock this chapter." }
            if (unitData.chapterId.chapterNumber > 1 && req.user.status != 3 && req.user.status != 4) throw { status: 402, message: "To continue learning please subscribe!" }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString()) != "64ed9453511b7d753021d3cb") throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
                // if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
            }
        }

        if (!responses.length) throw { status: 400, message: "Response can not be empty" }

        let calculatedData = calculateAssessmentPercentage(testData.questions, responses);
        let percentage = calculatedData.percentage;
        responses = calculatedData.responses;

        let data = await UserPretestLogs.findOne({ userId, unitId, testId });
        if (data) maxPercentage = (data.maxPercentage > percentage) ? data.maxPercentage : percentage;
        if (!data) maxPercentage = percentage;
        const currentDate = getCurrentDateAndTime();
        let updateBody = {
            userId,
            testId,
            unitId,
            responses,
            maxPercentage,
            currentAttemptPercentage: percentage,
            lastAttemptedAt: currentDate,
            updatedAt: currentDate
        }
        if (!data) updateBody.createdAt = currentDate;
        data = await UserPretestLogs.findOneAndUpdate({ userId, unitId, testId }, { $set: updateBody }, { new: true, upsert: true })
        res.status(200).send({ status: 1, message: "Pretest submitted successfully!", data })
    }
    catch (error) {
        next(error)
    }
}


exports.submitFinaltest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const currentDate = getCurrentDateAndTime();
        let {
            testId,
            unitId,
            responses,
            maxPercentage

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            testId,
            unitId,
            responses
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let testData = await FinalTest.findOne({ _id: testId, isDeleted: false });
        if (!testData) throw { status: 404, message: "No test found." }
        testData = JSON.parse(JSON.stringify(testData))

        let materialData = await Material.findOne({ unitId, isDeleted: false });
        if (materialData) {
            let materialLogsData = await UserMaterialLogs.findOne({ unitId, isDeleted: false, userId });
            if (!materialLogsData) throw { status: 403, message: "Unlock your material.Please read material first" }
        }

        let unitData = await Unit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: 'chapterId', select: 'chapterNumber subjectId combinationId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }

        const chapterId = unitData.chapterId._id;
        const subjectId = unitData.chapterId.subjectId;
        let attemptedOn;  //For Storing test logs

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserCourseUnlockCounter.findOne({ userId, subjectId: unitData.subjectId, combinationId: unitData.chapterId.combinationId })
        // if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please complete previous unit to unlock this unit." }
        if (!unitLogsData && (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }

        if (unitLogsData) {
            // if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please complete previous chapter to unlock this chapter." }
            if (unitData.chapterId.chapterNumber > 1 && req.user.status != 3 && req.user.status != 4) throw { status: 402, message: "To continue learning please subscribe!" }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString() != "64ed9453511b7d753021d3cb")) throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && (req.user.status == 2 || (req.user.status == 1 && isTrailPeriodCompleted(getCurrentDateAndTime(), req.user.planExpiresAt)))) throw { status: 402, message: "Your trail period is completed. Please purchase the plan." }
                // if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 500, message: "Please complete previous unit to unlock this unit." }
            }
        }
        //After getting access
        if (!responses.length) throw { status: 400, message: "No responses found!" }
        let commonQuestions = (testData.questions).filter(question =>
            responses.some(response => (response.questionId).toString() == (question._id).toString()));
        let calculatedData = calculateAssessmentPercentage(commonQuestions, responses);
        let percentage = calculatedData.percentage;
        responses = calculatedData.responses;
        let data = await UserFinaltestLogs.findOne({ userId, unitId, testId });
        if (!data) maxPercentage = percentage, attemptedOn = 0;
        else if (data) {
            attemptedOn = (data.maxPercentage >= 60) ? 1 : 0;
            maxPercentage = (data.maxPercentage > percentage) ? data.maxPercentage : percentage;
        }

        //When the user qualified in assessment
        if ((!data && percentage >= 60) || ((data && data.maxPercentage < 60) && percentage >= 60)) {
            console.log("coming")
            let nextUnlockedChapterNumber, nextUnlockedUnitNumber;
            let chapterUnitsData = await Unit.findOne({ chapterId: unitData.chapterId._id }).sort({ unitNumber: -1 })
            console.log({ cn: unitData.chapterId.chapterNumber })
            if (unitData.unitNumber < chapterUnitsData.unitNumber) {
                nextUnlockedChapterNumber = unitData.chapterId.chapterNumber;
                nextUnlockedUnitNumber = unitData.unitNumber + 1;
            } if (unitData.unitNumber == chapterUnitsData.unitNumber) {
                nextUnlockedChapterNumber = unitData.chapterId.chapterNumber + 1
                nextUnlockedUnitNumber = 1;
            }
            let unlockData = await UserCourseUnlockCounter.findOne({ userId, subjectId: unitData.subjectId, combinationId: unitData.chapterId.combinationId });
            if (!unlockData) {
                unlockData = await UserCourseUnlockCounter.create({
                    nextUnlockedUnitNumber,
                    nextUnlockedChapterNumber,
                    userId,
                    subjectId: unitData.subjectId,
                    combinationId: unitData.chapterId.combinationId,
                    createdAt: currentDate,
                    updatedAt: currentDate,
                    nextUnlockDate: getTomorrowDate()
                })
            }
            else if (unlockData) {
                unlockData = await UserCourseUnlockCounter.findOneAndUpdate({ userId, subjectId: unitData.subjectId, combinationId: unitData.chapterId.combinationId }, {
                    $set: {
                        nextUnlockedUnitNumber,
                        nextUnlockedChapterNumber,
                        userId,
                        subjectId: unitData.subjectId,
                        combinationId: unitData.chapterId.combinationId,
                        updatedAt: currentDate,
                        nextUnlockDate: getTomorrowDate()
                    }
                }, { new: true })
            }
        }

        let updateBody = {
            userId,
            testId,
            unitId,
            responses,
            chapterId,
            subjectId,
            maxPercentage: Math.round(maxPercentage),
            currentAttemptPercentage: Math.round(percentage),
            lastAttemptedAt: currentDate,
            updatedAt: currentDate
        }
        if (!data) updateBody.createdAt = currentDate;

        //Storing finaltest
        data = await UserFinaltestLogs.findOneAndUpdate({ userId, unitId, testId }, { $set: updateBody }, { new: true, upsert: true });

        //Storing User TestLogs
        await UserCourseTestLogs.create({
            combinationId: unitData.chapterId.combinationId, responses, userId, testId, unitId,
            chapterId, subjectId, percentage: Math.round(percentage), createdAt: currentDate, updatedAt: currentDate,
            attemptedOn, type: 1
        })
        res.status(200).send({ status: 1, message: "Final test submitted sucessfully!", data })
    }
    catch (e) {
        next(e)
    }
}

/*-----------------------------COURSE-PERFORMANCES-API'S------------------*/
exports.getUserCoursePerformances = async (req, res, next) => {
    try {
        let userId = req.user._id;
        let subjectId = req.query.subjectId;
        let courseId = req.query.courseId;
        let combinationId = req.query.combinationId;

        // if (!subjectId) throw { status: 400, message: "Please provide subjectId." }

        if (subjectId) {
            let subjectData = await Subject.findOne({ _id: subjectId, isDeleted: false });
            if (!subjectData) throw { status: 404, message: "No subject found!" }
        }
        if (courseId) {
            let courseData = await Course.findOne({ _id: courseId, isDeleted: false });
            if (!courseData) throw { status: 404, message: "No course found!" }
        }
        if (combinationId) {
            let combinationData = await CourseSubjectCombination.findOne({ _id: combinationId, isDeleted: false });
            if (!combinationData) throw { status: 404, message: "No combination found!" }
        }

        let matchFilters = {
            userId: mongoose.Types.ObjectId(userId),
            attemptedOn: 0
        }
        if (subjectId) matchFilters.subjectId = mongoose.Types.ObjectId(subjectId);
        if (courseId) matchFilters.courseId = mongoose.Types.ObjectId(courseId);
        if (combinationId) matchFilters.combinationId = mongoose.Types.ObjectId(combinationId);


        let aggregateQuery = [
            {
                $match: matchFilters

            },
            { $unwind: "$responses" },
        ]
        if ((subjectId && !courseId) || (!subjectId && !courseId)) aggregateQuery.push(
            {
                $lookup: {
                    from: "subjects",
                    localField: "subjectId",
                    foreignField: "_id",
                    as: "subject"
                }
            },
            { $unwind: "$subject" },
            {
                $group: {
                    _id: "$subjectId",
                    subjectName: { $first: "$subject.subjectName" },
                    totalResponses: { $sum: 1 },
                    correctResponses: {
                        $sum: {
                            $cond: [{ $eq: ["$responses.isAnswerCorrect", 1] }, 1, 0] // Count of responses where isAnswerCorrect is 1
                        }
                    },
                    incorrectResponses: {
                        $sum: {
                            $cond: [{ $eq: ["$responses.isAnswerCorrect", 0] }, 1, 0] // Count of responses where isAnswerCorrect is 0
                        }
                    }
                }
            }
        )

        if (courseId && !subjectId) aggregateQuery.push(
            {
                $lookup: {
                    from: "courses",
                    localField: "courseId",
                    foreignField: "_id",
                    as: "course"
                }
            },
            { $unwind: "$course" },
            {
                $group: {
                    _id: "$courseId",
                    courseName: { $first: "$course.courseName" },
                    totalResponses: { $sum: 1 },
                    correctResponses: {
                        $sum: {
                            $cond: [{ $eq: ["$responses.isAnswerCorrect", 1] }, 1, 0] // Count of responses where isAnswerCorrect is 1
                        }
                    },
                    incorrectResponses: {
                        $sum: {
                            $cond: [{ $eq: ["$responses.isAnswerCorrect", 0] }, 1, 0] // Count of responses where isAnswerCorrect is 0
                        }
                    }
                }
            }
        )

        let data = await UserCourseTestLogs.aggregate(aggregateQuery);

        if (data.length) {
            data = data.reduce((acc, { _id, courseName, subjectName, ...rest }) => {
                Object.entries(rest).forEach(([key, value]) => acc[key] = (acc[key] || 0) + value);
                return acc;
            }, {});
            data = [data]
        }
        res.status(200).send({ status: 1, message: "Course performances fetched successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getUserCourseProgressOld = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let data = await Subject.aggregate([
            { $match: { isDeleted: false } },
            {
                $lookup: {
                    from: "chapters",
                    localField: "_id",
                    foreignField: "subjectId",
                    as: "chapters"
                }
            },
            {
                $project: {
                    subjectName: 1,
                    totalChapters: {
                        $size: {
                            $filter: {
                                input: "$chapters",
                                as: "chapter",
                                cond: { $eq: ["$$chapter.isDeleted", false] }
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "usercourseunlockcounters",
                    let: { subjectId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$subjectId", "$$subjectId"] },
                                        { $eq: ["$userId", mongoose.Types.ObjectId(userId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "userLogs"
                }
            },
            {
                $project: {
                    subjectName: 1,
                    totalChapters: 1,
                    userCurrentChapter: { $arrayElemAt: ["$userLogs.nextUnlockedChapterNumber", 0] }
                }
            },

        ]);
        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            data = data.map((x) => {
                if (!x.userCurrentChapter) x.userCurrentChapter = 1, x.userCompletedChapters = 0;
                else if (x.userCurrentChapter > 1) x.userCompletedChapters = parseInt(x.userCurrentChapter - 1);
                else if (x.userCurrentChapter <= 1) x.userCompletedChapters = 0;
                return x;
            })
        }
        res.status(200).send({ status: 1, message: "Course progress fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}


exports.getUserCourseProgress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let matchFilters = { userId: mongoose.Types.ObjectId(userId) };
        if (req.query.courseId) {
            let courseData = await Course.findOne({ _id: req.query.courseId, isDeleted: false });
            if (!courseData) throw { status: 404, message: "No course found!" }
            matchFilters.courseId = mongoose.Types.ObjectId(req.query.courseId)
        }
        let data = await UserCourse.aggregate([
            {
                $match: matchFilters
            },
            {
                $lookup: {
                    from: 'coursesubjectcombinations',
                    localField: 'courseId',
                    foreignField: 'courseId',
                    as: 'combinationData'
                }
            },
            {
                $unwind: "$combinationData"
            },
            {
                $match: { "combinationData.isDeleted": false }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'combinationData.courseId',
                    foreignField: '_id',
                    as: 'courseData'
                }
            },
            {
                $unwind: '$courseData'
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'combinationData.subjectId',
                    foreignField: '_id',
                    as: 'subjectData'
                }
            },
            {
                $unwind: "$subjectData"
            },
            {
                $lookup: {
                    from: 'chapters',
                    localField: 'combinationData._id',
                    foreignField: 'combinationId',
                    as: 'chapters'
                }
            },
            {
                $project: {
                    subjectName: '$subjectData.subjectName',
                    courseName: '$courseData.courseName',
                    subjectId: '$subjectData._id',
                    courseId: '$courseData._id',
                    combinationId: '$combinationData._id',
                    totalChapters: {
                        $size: {
                            $filter: {
                                input: "$chapters",
                                as: "chapter",
                                cond: { $eq: ["$$chapter.isDeleted", false] },
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'usercourseunlockcounters',
                    let: { combinationId: '$combinationId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$combinationId', '$$combinationId'] },
                                        { $eq: ['$userId', mongoose.Types.ObjectId(userId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'userLogs'
                }
            },
            {
                $project: {
                    _id: 0,
                    subjectId: 1,
                    courseId: 1,
                    combinationId: 1,
                    subjectName: 1,
                    courseName: 1,
                    totalChapters: 1,
                    userCurrentChapter: { $arrayElemAt: ["$userLogs.nextUnlockedChapterNumber", 0] }
                }
            },
        ]);
        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            data = data.map((x) => {
                if (!x.userCurrentChapter) x.userCurrentChapter = 1, x.userCompletedChapters = 0;
                else if (x.userCurrentChapter > 1) x.userCompletedChapters = parseInt(x.userCurrentChapter - 1);
                else if (x.userCurrentChapter <= 1) x.userCompletedChapters = 0;
                return x;
            })
        }
        res.status(200).send({ status: 1, message: "Course progress fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}


exports.getUserTopSeriesTests = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let matchFilters = { userId: mongoose.Types.ObjectId(userId) };
        if (req.query.courseId) {
            let courseData = await Course.findOne({ _id: req.query.courseId, isDeleted: false });
            if (!courseData) throw { status: 404, message: "No course found!" }
            matchFilters.courseId = mongoose.Types.ObjectId(req.query.courseId)
        }
        let data = await UserCourse.aggregate([
            {
                $match: matchFilters
            },
            {
                $lookup: {
                    from: 'coursesubjectcombinations',
                    localField: 'courseId',
                    foreignField: 'courseId',
                    as: 'combinationData'
                }
            },
            {
                $unwind: "$combinationData"
            },
            {
                $match: { "combinationData.isDeleted": false }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'combinationData.courseId',
                    foreignField: '_id',
                    as: 'courseData'
                }
            },
            {
                $unwind: '$courseData'
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'combinationData.subjectId',
                    foreignField: '_id',
                    as: 'subjectData'
                }
            },
            {
                $unwind: "$subjectData"
            },
            {
                $lookup: {
                    from: 'userseriestestlogs',
                    localField: 'combinationData._id',
                    foreignField: 'combinationId',
                    as: 'testData'
                }
            },
            { $unwind: '$testData' },
            {
                $match: {
                    'testData.userId': mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: '$combinationData._id',
                    combinationId: { $first: '$combinationData._id' },
                    subjectId: { $first: '$combinationData.subjectId' },
                    subjectName: { $first: '$subjectData.subjectName' },
                    courseId: { $first: '$combinationData.courseId' },
                    courseName: { $first: '$courseData.courseName' },
                    testData: { $push: '$testData' }
                }
            }
        ]);
        data = JSON.parse(JSON.stringify(data));

        if (data.length) {
            data = JSON.parse(JSON.stringify(data));
            data = data.map((x) => {
                if (Array.isArray(x.testData) && x.testData.length) {
                    x.testData = x.testData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    x.testData = x.testData.slice(0, 5).map(({ createdAt, percentage, combinationId }) => ({
                        createdAt,
                        percentage,
                        combinationId
                    }));
                }
                return x;
            });
        }
        res.status(200).send({ status: 1, message: "Series tests data fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}



/********************CHALLENGE-API'S******************************/
exports.fetchActiveChallengesList = async (req, res, next) => {
    try {
        let {
            limit, page, skip, id, courseId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let userId = req.user._id;

        let matchFilter = {
            isDeleted: false
        }
        if (id) matchFilter._id = mongoose.Types.ObjectId(id)
        if (courseId) {
            let courseData = await Course.findOne({ _id: courseId, isDeleted: false });
            if (!courseData) throw { status: 404, message: "No course found" }
            matchFilter.courseId = mongoose.Types.ObjectId(courseId)
        }

        let data = await Challenges.aggregate([
            {
                $match: matchFilter
            },
            {
                $lookup: {
                    from: "userchallenges",
                    let: { challengeId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$challengeId', '$$challengeId'] },
                                        { $eq: ['$userId', mongoose.Types.ObjectId(userId)] }]
                                }
                            }
                        }
                    ],
                    as: 'joinedChallenges'
                }
            },
            {
                $project: {
                    _id: 1,
                    courseId: 1,
                    categoryId: 1,
                    title: 1,
                    startDate: 1,
                    endDate: 1,
                    lastDate: 1,
                    rules: 1,
                    type: 1,
                    resultsOutDate: 1,
                    isDeleted: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    isJoined: { $cond: { if: { $gt: [{ $size: '$joinedChallenges' }, 0] }, then: true, else: false } }
                }
            },
            {
                $sort: {
                    lastDate: 1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ])

        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            data = data.map((x) => {
                if (new Date(x.startDate) > new Date(getCurrentDateAndTime())) x.status = 0
                else if (new Date(x.startDate) < new Date(getCurrentDateAndTime()) && new Date(x.endDate) > new Date(getCurrentDateAndTime())) x.status = 1
                else if (new Date(x.startDate) < new Date(getCurrentDateAndTime()) && new Date(x.endDate) < new Date(getCurrentDateAndTime())) x.status = 2
                return x;
            })
        }

        res.status(200).send({ status: 1, message: "Challenges fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}
exports.joinCourseChallenge = async (req, res, next) => {
    try {
        const currentDate = getCurrentDateAndTime();
        let userId = req.user._id;
        let {
            challengeId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            challengeId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);


        let challengeData = await Challenges.findOne({ _id: challengeId, isDeleted: false });
        if (!challengeData) throw { status: 404, message: "No challenge found" }

        if (challengeData.type == 2 && req.user.status != 4) throw { status: 403, message: "Only paid users can join this challenge." }
        if (challengeData.type == 3 && req.user.status != 1) throw { status: 403, message: "Only free users can join this challenge." }

        let data = await UserChallenges.findOne({ userId, challengeId, isDeleted: false });
        if (data) throw { status: 409, message: "User has already joined this challenge. Please try for another" }

        if (new Date(getCurrentDateAndTime()) > new Date(challengeData.lastDate)) throw { status: 403, message: "New joinings are closed. Please try for another challenge" }

        data = await UserChallenges.create({
            userId,
            challengeId: challengeData._id,
            courseId: challengeData.courseId,
            categoryId: challengeData.categoryId,
            createdAt: currentDate,
            updatedAt: currentDate
        })
        if (!data) throw { message: "Unable to join challenge. Try again" }

        res.status(200).send({ status: 1, message: "Challenge joined successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchJoinedChallenges = async (req, res, next) => {
    try {
        let {
            limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let totalDataCount = await UserChallenges.find({ userId: req.user._id, isDeleted: false }).countDocuments();
        let data = await UserChallenges.find({ userId: req.user._id, isDeleted: false }).populate([
            { path: 'challengeId', select: 'title rules startDate endDate lastDate resultsOutDate' },
            { path: 'courseId', select: 'courseName type icon' },
            { path: 'categoryId', select: 'name' }
        ]).sort({ createdAt: -1 });

        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            data = data.map((x) => {
                let { challengeId } = x;
                if (new Date(challengeId.startDate) > new Date(getCurrentDateAndTime())) challengeId.status = 0
                else if (new Date(challengeId.startDate) < new Date(getCurrentDateAndTime()) && new Date(challengeId.endDate) > new Date(getCurrentDateAndTime())) challengeId.status = 1
                else if (new Date(challengeId.startDate) < new Date(getCurrentDateAndTime()) && new Date(challengeId.endDate) < new Date(getCurrentDateAndTime())) challengeId.status = 2
                let challengeDate = new Date(x.challengeId.startDate).toISOString().split('T')[0];
                let day = getDaysDifference(challengeDate, getCurrentDate()) + 1;
                x.day = day;
                challengeId.day = day;
                return x;
            })
        }

        res.status(200).send({ status: 1, message: "User joined challenges fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        console.log({ error })
        next(error)
    }
}

exports.fetchChallengeAssessment = async (req, res, next) => {
    try {
        let {
            challengeId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            challengeId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let userId = req.user._id;
        let challengeData = await Challenges.findOne({ _id: challengeId, isDeleted: false });
        if (!challengeData) throw { status: 404, message: "No challenge found" }

        if (challengeData.type == 2 && req.user.status != 4) throw { status: 403, message: "Only paid users can access this assessment." }
        if (challengeData.type == 3 && req.user.status != 1) throw { status: 403, message: "Only free users can access this assessment." }

        let userChallengeData = await UserChallenges.findOne({ userId, challengeId, isDeleted: false, });
        if (!userChallengeData) throw { status: 422, message: "Please join the challenge first." }

        if (new Date(challengeData.startDate) > getCurrentDateAndTime()) throw { status: 403, message: "Challenge not started yet." }

        let challengeDate = new Date(challengeData.startDate).toISOString().split('T')[0];
        let day = getDaysDifference(challengeDate, getCurrentDate()) + 1;

        let data = await UserAssessmentLogs.findOne({ challengeId, isDeleted: false, userId, day });
        if (data) throw { status: 422, message: "You're already submitted today's assessment. Please try tomorrow." }

        let previousAssessmentIds = await UserAssessmentLogs.find({ challengeId, isDeleted: false, userId }).distinct('assessmentId');
        data = await Assessment.findOne({ isDeleted: false, challengeId: challengeData._id, _id: { $nin: previousAssessmentIds } });

        if (!data) throw { status: 422, message: "You're already submitted this assessment." }
        res.status(200).send({ status: 1, message: "Assessment fetched successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.submitChallengeAssessment = async (req, res, next) => {
    try {

        let {
            assessmentId,
            responses
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            assessmentId,
            responses
        }
        let userId = req.user._id;
        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        if (!responses.length) throw { status: 400, message: "Response cannot be empty" }

        let testData = await Assessment.findOne({ _id: assessmentId, isDeleted: false });
        if (!testData) throw { status: 404, message: "No assessment found!" }

        let testChallengeData = await Challenges.findOne({ _id: testData.challengeId });
        if (new Date(testChallengeData.startDate) > new Date(getCurrentDateAndTime())) throw { status: 403, message: "Challenge not started yet." }

        if (testChallengeData.type == 2 && req.user.status != 4) throw { status: 403, message: "Only paid users can submit this assessment." }
        if (testChallengeData.type == 3 && req.user.status != 1) throw { status: 403, message: "Only free users can submit this assessment." }

        let challengeData = await UserChallenges.findOne({ userId, challengeId: testData.challengeId, isDeleted: false, });
        if (!challengeData) throw { status: 422, message: "Please join the challenge first." }
        let challengeDate = new Date(testChallengeData.startDate).toISOString().split('T')[0];
        let day = getDaysDifference(challengeDate, getCurrentDate()) + 1;

        let data = await UserAssessmentLogs.findOne({ challengeId: testData.challengeId, isDeleted: false, userId, day });
        if (data) throw { status: 422, message: "You're already submitted today's assessment. Please try tomorrow." }


        let calculatedData = calculateAssessmentPercentage(testData.questions, responses);
        let percentage = calculatedData.percentage;
        responses = calculatedData.responses;


        data = await UserAssessmentLogs.create({
            challengeId: testData.challengeId,
            assessmentId,
            userId,
            courseId: testData.courseId,
            responses,
            percentage,
            day,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        })
        if (!data) throw { status: 422, message: "Failed to submit the assessment. Please try again" }
        res.status(200).send({ status: 1, message: "Assessment submitted successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.getChallengeAssessmentLogs = async (req, res, next) => {
    try {

        let {
            challengeId,
            id, limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            challengeId
        }
        let userId = req.user._id;
        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        let challengeData = await Challenges.findOne({ _id: challengeId, isDeleted: false });
        if (!challengeData) throw { status: 404, message: "No challenge found" }

        // if (new Date(challengeData.startDate) > getCurrentDateAndTime()) throw { status: 403, message: "Challenge not started yet." }

        let dbQuery = { userId, isDeleted: false, challengeId }
        if (id) dbQuery._id = id;
        let totalDataCount = await UserAssessmentLogs.find(dbQuery).countDocuments();
        let data = await UserAssessmentLogs.find(dbQuery).populate([{ path: 'challengeId' }, { path: 'assessmentId', select: 'questions' }, { path: 'courseId', select: 'courseName icon type' }]).sort({ day: -1 }).limit(limit).skip(skip);
        res.status(200).send({ status: 1, message: "Logs fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.getChallengesLeaderBoard = async (req, res, next) => {
    try {
        let {
            challengeId,
            limit
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            challengeId
        }
        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        let userId = req.user._id;
        let role = req.user.role;
        limit = limit ? limit : 10;

        let challengeData = await Challenges.findOne({ _id: challengeId, isDeleted: false });
        if (!challengeData) throw { status: 404, message: "No challenge found" }
        if (new Date(challengeData.startDate) > new Date(getCurrentDateAndTime())) throw { status: 403, message: "Challenge not started yet." }
        let checkUserChallenge;
        if (role == "user") checkUserChallenge = await UserChallenges.findOne({ userId, challengeId, isDeleted: false, })
        // if (!checkUserChallenge) throw { status: 422, message: "Please join the challenge first." }

        const fromDate = challengeData.startDate;
        const toDate = (new Date(getCurrentDateAndTime()) > new Date(challengeData.endDate)) ? challengeData.endDate : getCurrentDate();
        const totalAssessmentsCount = getDaysDifference(fromDate, toDate) + 1;
        // const resultsOutDate = challengeData.resultsOutDate;

        //Fetching assessment logs of userId by challenges and users who joined the challenges
        const [logsData, challengesData] = await Promise.all([
            UserAssessmentLogs.aggregate([
                {
                    $match: {
                        challengeId: mongoose.Types.ObjectId(challengeId),
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: "$userId",
                        totalPercentage: { $sum: "$percentage" }
                    }
                },
                {
                    $project: {
                        userId: "$_id",
                        averagePercentage: { $divide: ["$totalPercentage", totalAssessmentsCount] }
                    }
                }
            ]),
            UserChallenges.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        challengeId: mongoose.Types.ObjectId(challengeId)
                    }
                },
                { $group: { _id: '$userId' } },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        userId: '$_id',
                        name: { $arrayElemAt: ['$userDetails.name', 0] },
                        email: { $arrayElemAt: ['$userDetails.email', 0] },
                        level: { $arrayElemAt: ['$userDetails.level', 0] },
                        mobileNo: { $arrayElemAt: ['$userDetails.mobileNo', 0] },
                        referralCode: { $arrayElemAt: ['$userDetails.referralCode', 0] },
                        profileImageUrl: { $arrayElemAt: ['$userDetails.profileImageUrl', 0] }
                    }
                }
            ])
        ]);
        const challengeJoinedUserIds = challengesData.map(x => x.userId);
        const [referralData, activitiesData] = await Promise.all([
            User.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        sponsorId: { $in: challengeJoinedUserIds },
                        createdAt: { $gte: challengeData.startDate, $lte: challengeData.resultsOutDate },
                        status: 4
                    }
                },
                {
                    $group: {
                        _id: "$sponsorId",
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        userId: "$_id",
                        count: 1
                    }
                }
            ]),
            UserActivityLogs.aggregate([
                {
                    $match: {
                        userId: { $in: challengeJoinedUserIds },
                        createdAt: { $gte: challengeData.startDate, $lte: challengeData.endDate },
                        activity: { $in: ['current_affairs_viewed', 'quiz_viewed'] }
                    }
                },
                {
                    $group: {
                        _id: '$userId',
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        userId: '$_id',
                        count: 1
                    }
                }
            ])
        ])

        //Alloting percentages
        const users = challengesData.map(user => {
            const log = logsData.find(log => log.userId.toString() === user.userId.toString());
            const referralsCount = referralData.find(obj => obj.userId.toString() === user.userId.toString());
            const activitiesCount = activitiesData.find(activity => activity.userId.toString() === user.userId.toString());
            return {
                userId: user.userId,
                name: user.name,
                email: user.email,
                mobileNo: user.mobileNo,
                referralCode: user.referralCode,
                profileImageUrl: user.profileImageUrl,
                averagePercentage: log ? Math.floor(log.averagePercentage * 100) / 100 : 0,
                referralsCount: referralsCount ? referralsCount.count : 0,
                activitiesCount: activitiesCount ? activitiesCount.count : 0
            };
        });

        //Generating Ranks for users
        const assessmentLeaderBoardDetails = generateAssessmentLeaderBoard(JSON.parse(JSON.stringify(users)));
        const activitiesLeaderBoardDetails = generateActivitiesLeaderBoard(JSON.parse(JSON.stringify(users)));
        const referralLeaderBoardDetails = generateReferralLeaderBoard(JSON.parse(JSON.stringify(users)));

        let responseData = {}

        //Current user rankings fetch
        if (checkUserChallenge) {
            let currentUserAssessmentData = assessmentLeaderBoardDetails.find(user => user.userId.toString() == userId.toString());
            let currentUserActivitiesData = activitiesLeaderBoardDetails.find(user => user.userId.toString() == userId.toString());
            let currentUserReferralData = referralLeaderBoardDetails.find(user => user.userId.toString() == userId.toString());

            responseData.currentUserRankingDetails = {
                currentUserAssessmentRankingDetails: currentUserAssessmentData,
                currentUserActivitiesRankingDetails: currentUserActivitiesData,
                currentUserReferralRankingDetails: currentUserReferralData
            }
        }

        if (new Date(challengeData.resultsOutDate) < new Date(getCurrentDateAndTime())) {
            let winnerData = await ChallengeWinners.findOne({ challengeId, isDeleted: false });
            winnerData = JSON.parse(JSON.stringify(winnerData));
            let winnerRankingDetails = [];
            if (winnerData && (winnerData.winners).length) {
                let winners = winnerData.winners;
                winners = [...new Set(winners)];
                winners.map((winnerId) => {
                    let winnerAssessmentData = assessmentLeaderBoardDetails.find(user => user.userId.toString() == winnerId.toString());
                    let winnerActivitiesData = activitiesLeaderBoardDetails.find(user => user.userId.toString() == winnerId.toString());
                    let winnerReferralData = referralLeaderBoardDetails.find(user => user.userId.toString() == winnerId.toString());
                    if (winnerAssessmentData) winnerAssessmentData.assessmentRank = winnerAssessmentData.rank;
                    if (winnerActivitiesData) winnerActivitiesData.activitiesRank = winnerActivitiesData.rank;
                    if (winnerReferralData) winnerReferralData.referralRank = winnerReferralData.rank;
                    let winnerDetails = { ...winnerAssessmentData, ...winnerActivitiesData, ...winnerReferralData };
                    delete winnerDetails.rank;
                    winnerRankingDetails.push(winnerDetails);
                });
            }
            responseData.winnerRankingDetails = winnerRankingDetails;
        }

        responseData.assessmentLeaderBoardDetails = (applyPagination(assessmentLeaderBoardDetails, limit)).map(({ assessmentRank, ...rest }) => rest);
        responseData.activitiesLeaderBoardDetails = (applyPagination(activitiesLeaderBoardDetails, limit)).map(({ activitiesRank, ...rest }) => rest);
        responseData.referralLeaderBoardDetails = (applyPagination(referralLeaderBoardDetails, limit)).map(({ referralRank, ...rest }) => rest);


        res.status(200).send({
            status: 1, message: "Leaderboard fetched successfully",
            data: responseData
        })
    }
    catch (error) {
        next(error)
    }
}

exports.addChallengeWinner = async (req, res, next) => {
    try {
        let {
            challengeId, winners
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            challengeId, winners
        }
        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (!winners.length) throw { status: 400, message: "Please provide atleast one winner" }
        winners = [...new Set(winners)];

        let challengeData = await Challenges.findOne({ _id: challengeId, isDeleted: false });
        if (!challengeData) throw { status: 404, message: "No challenge found" }
        if (new Date(challengeData.startDate) > new Date(getCurrentDateAndTime())) throw { status: 403, message: "Challenge not started yet." }
        if (new Date(challengeData.resultsOutDate) > new Date(getCurrentDateAndTime())) throw { status: 403, message: "Challenge not completed yet." }

        let userChallengeData = await UserChallenges.find({ userId: { $in: winners }, challengeId, isDeleted: false }).countDocuments();
        console.log({ userChallengeData })
        if (!userChallengeData || (userChallengeData != winners.length)) throw { status: 404, message: "Some users didn't participated in this challenge." }

        let data = await ChallengeWinners.findOneAndUpdate({ challengeId }, {
            $set: {
                winners, challengeId,
                createdAt: getCurrentDateAndTime(),
                updatedAt: getCurrentDateAndTime()
            }
        }, { upsert: true, new: true, setDefaultsOnInsert: true })

        res.status(200).send({
            status: 1, message: "Winner's added for challenge successfully",
            data
        })
    }
    catch (error) {
        next(error)
    }
}

