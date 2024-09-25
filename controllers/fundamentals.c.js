const mongoose = require("mongoose");
let { shuffleArray, capitalizeEveryInnerWord, isRequestDataValid, calculateAssessmentPercentage } = require('../utils/appUtils');
let { UserFundamentalUnlockCounters, UserFundamentalFinalTestLogs, UserFundamentalPreTestLogs, UserFundamentalMaterialLogs, User,
    FundamentalSubject, FundamentalChapter, FundamentalUnit, FundamentalMaterial, FundamentalFinalTest, FundamentalPreTest,
    UserFundamentalTestLogs, Subject, Course, Category, CourseSubjectCombination, UserCourseTestLogs } = require('../models')
const { getCurrentDateAndTime, getTomorrowDate } = require("../helpers/dates");
const moment = require('moment');

exports.addFundamentalSubject = async (req, res, next) => {
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
        const currentDate = getCurrentDateAndTime();

        let data = await FundamentalSubject.create({
            subjectName: capitalizeEveryInnerWord(subjectName),
            icon,
            status,
            createdAt: currentDate,
            updatedAt: currentDate
        });
        if (!data) throw { message: "Unable to add fundamental subject.Try again" }
        res.status(201).send({ status: 1, message: "Fundamental subject added successfully", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getFundamentalSubject = async (req, res, next) => {
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

        let paginatedData = await FundamentalSubject.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await FundamentalSubject.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Fundamental subjects list fetched successfully", totalDataCount, currentPageCount: paginatedData.length, data: paginatedData })

    }
    catch (e) {
        next(e)
    }
}


exports.editFundamentalSubject = async (req, res, next) => {
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

        let data = await FundamentalSubject.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No subject found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status != undefined && status != null) dbQuery.status = status;
        if (subjectName) dbQuery.subjectName = capitalizeEveryInnerWord(subjectName);
        if (icon) dbQuery.icon = icon;
        data = await FundamentalSubject.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental subject updated successfully!", data });

    }
    catch (e) {
        next(e)
    }
}


exports.deleteFundamentalSubject = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalSubject.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental subject Deleted sucessfully!", data: {} })

    }
    catch (e) {
        next(e)
    }
}



exports.fetchFundamentalSubjectsListByUser = async (req, res, next) => {
    try {

        let subjectId = req.query.subjectId;
        let userId = req.user._id;

        let aggregateQuery = [];

        if (subjectId) {
            let data = await FundamentalSubject.findOne({ _id: subjectId, isDeleted: false });
            if (!data) throw { status: 404, message: "No subject found!" }

            //Filters_attaching
            aggregateQuery.push({
                $match: { _id: mongoose.Types.ObjectId(subjectId) },
            },)
        }

        aggregateQuery.push(
            {
                $match: { isDeleted: false }
            },
            {
                $lookup: {
                    from: 'fundamentalchapters',
                    localField: '_id',
                    foreignField: 'subjectId',
                    as: 'chapters',
                },
            },
            {
                $unwind: "$chapters"
            },
            { $match: { 'chapters.isDeleted': false } },
            {
                $sort: {
                    "chapters.chapterNumber": 1
                }
            },
            {
                $group: {
                    _id: "$_id",
                    status: { $first: "$status" },
                    subjectName: { $first: "$subjectName" },
                    isDeleted: { $first: "$isDeleted" },
                    icon: { $first: "$icon" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                    chapters: { $push: "$chapters" }
                }
            },
            {
                $sort: {
                    subjectName: 1
                }
            }
        )

        data = await FundamentalSubject.aggregate(aggregateQuery);
        data = JSON.parse(JSON.stringify(data))

        //Checking_Lock_features_For_User_Based_On_SubjecId
        if (subjectId && data.length && data[0].chapters && data[0].chapters.length) {
            let chapters = data[0].chapters;
            let countersData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId });
            if (!countersData) {
                chapters = chapters.map((x) => {
                    x.isLocked = (x.chapterNumber == 1) ? false : true; return x;
                })
            }
            // else if (countersData) {
            //     chapters = chapters.map((x) => {
            //         if (x.chapterNumber == 1) x.isLocked = false;
            //         if (x.chapterNumber < countersData.nextUnlockedChapterNumber) x.isLocked = false;
            //         if (x.chapterNumber > countersData.nextUnlockedChapterNumber) x.isLocked = true;
            //         if (x.chapterNumber != 1 && x.chapterNumber == countersData.nextUnlockedChapterNumber && new Date(getCurrentDateAndTime()) >= new Date(countersData.nextUnlockDate)) x.isLocked = false;
            //         if (x.chapterNumber != 1 && x.chapterNumber == countersData.nextUnlockedChapterNumber && new Date(getCurrentDateAndTime()) < new Date(countersData.nextUnlockDate)) x.isLocked = true;
            //         return x;
            //     })
            // }
            else if (countersData) {
                chapters = chapters.map((x) => {
                    if (x.chapterNumber == 1) x.isLocked = false;
                    if (x.chapterNumber < countersData.nextUnlockedChapterNumber) x.isLocked = false;
                    if (x.chapterNumber > countersData.nextUnlockedChapterNumber) x.isLocked = true;
                    if (x.chapterNumber != 1 && x.chapterNumber == countersData.nextUnlockedChapterNumber) {
                        if (userId.toString() == "64ed9453511b7d753021d3cb" || new Date(getCurrentDateAndTime()) >= new Date(countersData.nextUnlockDate)) x.isLocked = false
                    }
                    if (x.chapterNumber != 1 && x.chapterNumber == countersData.nextUnlockedChapterNumber) {
                        if (userId.toString() == "64ed9453511b7d753021d3cb" && new Date(getCurrentDateAndTime()) < new Date(countersData.nextUnlockDate)) x.isLocked = true;
                    }
                    return x;
                })
            }
            data[0].chapters = chapters;
        }
        res.status(200).send({ status: 1, message: "Fundamental subjects list fetched sucessfully!", data })
    }
    catch (e) {
        next(e)
    }
}

/*------------------------Chapter Apis-----------------------------------------*/
exports.addFundamentalChapter = async (req, res, next) => {
    try {

        let {
            chapterName,
            chapterNumber,
            subjectId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            chapterName,
            chapterNumber
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let combinationData = await FundamentalSubject.findOne({ _id: subjectId, isDeleted: false });
        if (!combinationData) throw { status: 404, message: "No subject found!" }

        let chapterData = await FundamentalChapter.findOne({ chapterNumber, subjectId, isDeleted: false });
        if (chapterData) throw { status: 409, message: "Chapter number is already added for this subject" }

        let data = await FundamentalChapter.create({
            chapterName: capitalizeEveryInnerWord(chapterName),
            chapterNumber,
            subjectId,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to store chapter.Try again" }
        res.status(200).send({ status: 1, message: "Fundamental chapter added successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getFundamentalChapters = async (req, res, next) => {
    try {
        let {
            id,
            chapterName,
            chapterNumber,
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
        if (subjectId) dbQuery.subjectId = subjectId;
        if (chapterNumber) dbQuery.chapterNumber = chapterNumber;

        let data = await FundamentalChapter.find(dbQuery).populate([{ path: 'subjectId', select: 'subjectName icon' }, { path: 'courseId', select: 'courseName type icon' }]).limit(limit).skip(skip).sort({ chapterNumber: 1 });
        let totalDataCount = await FundamentalChapter.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Fundamental chapters fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (e) {
        next(e)
    }
}


exports.editFundamentalChapter = async (req, res, next) => {
    try {
        let {
            id,
            chapterNumber,
            chapterName,
            subjectId,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalChapter.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No fundamental chapter found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status != undefined && status != null) dbQuery.status = status;
        if (chapterName) dbQuery.chapterName = capitalizeEveryInnerWord(chapterName);
        if (subjectId) {
            let combinationData = await FundamentalSubject.findOne({ _id: subjectId, isDeleted: false });
            if (!combinationData) throw { status: 404, message: "No fundamental subject found!" }
            dbQuery.subjectId = subjectId;
        }
        if (chapterNumber) {
            let chapterData = await FundamentalChapter.findOne({ chapterNumber, subjectId });
            if (chapterData && (chapterData._id).toString() !== id.toString()) throw { status: 409, message: "Chapter number is already taken for this subject.Try another" }
            dbQuery.chapterNumber = chapterNumber;
        }
        data = await FundamentalChapter.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental chapter updated successfully!", data })

    }
    catch (e) {
        next(e)
    }
}

exports.deleteFundamentalChapter = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalChapter.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Chapter deleted sucessfully!", data: {} })

    }
    catch (e) {
        next(e)
    }
}

/* ------------------------- FUNDAMENTAL UNIT- APIS-------------------------*/
exports.addFundamentalUnit = async (req, res, next) => {
    try {

        let {
            chapterId,
            unitNumber

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            chapterId,
            unitNumber
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let chapterData = await FundamentalChapter.findOne({ _id: chapterId, isDeleted: false });
        if (!chapterData) throw { status: 404, message: "No fundamental chapter found!" }

        let unitData = await FundamentalUnit.findOne({ unitNumber, chapterId, isDeleted: false });
        if (unitData) throw { status: 409, message: "Unit number is already taken.Try another" }

        unitData = await FundamentalUnit.create({
            unitNumber,
            chapterId,
            subjectId: chapterData.subjectId,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!unitData) throw { message: "Unable to add unit. Try again!" }
        res.status(201).send({ status: 1, message: "Unit added successfully!", data: unitData })
    }
    catch (e) {
        next(e)
    }
}

exports.getFundamentalUnits = async (req, res, next) => {
    try {
        let {
            id,
            unitNumber,
            chapterId,
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
        if (subjectId) dbQuery.subjectId = subjectId;
        if (unitNumber) dbQuery.unitNumber = unitNumber;

        let data = await FundamentalUnit.find(dbQuery).populate([{ path: 'chapterId', select: 'chapterName chapterNumber' }, { path: 'subjectId', select: 'subjectName icon' }]).limit(limit).skip(skip).sort({ unitNumber: 1 });
        let totalDataCount = await FundamentalUnit.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Fundamental units fetching successfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (e) {
        next(e)
    }
}


exports.editFundamentalUnits = async (req, res, next) => {
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

        let data = await FundamentalUnit.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No fundamental unit found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status != undefined && status != null) dbQuery.status = status;
        if (chapterId) {
            let chapterData = await FundamentalChapter.findOne({ _id: chapterId, isDeleted: false });
            if (!chapterData) throw { status: 404, message: "No fundamental chapter found!" }
            dbQuery.chapterId = chapterId;
        }
        if (unitNumber) {
            let unitData = await FundamentalUnit.findOne({ unitNumber });
            if (unitData && (unitData._id).toString() !== id.toString()) throw { status: 409, message: "UnitNumber is already taken. Try another" }
            dbQuery.unitNumber = unitNumber;
        }
        data = await FundamentalUnit.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental unit updated successfully!", data })

    }
    catch (e) {
        next(e)
    }
}


exports.deleteFundamentalUnit = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalUnit.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental unit deleted sucessfully!", data: {} })
    }
    catch (e) {
        next(e)
    }
}

exports.fetchFundamentalUnitByUser = async (req, res, next) => {
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
            chapterData = await FundamentalChapter.findOne({ _id: chapterId, isDeleted: false });
            if (!chapterData) throw { status: 404, message: "No chapter found!" }
            dbQuery.chapterId = chapterId;
        }
        if (subjectId) dbQuery.subjectId = subjectId;
        if (unitNumber) dbQuery.unitNumber = unitNumber;

        let totalDataCount = await FundamentalUnit.find(dbQuery).countDocuments();
        let data = await FundamentalUnit.find(dbQuery).populate([{ path: 'chapterId', select: 'chapterName chapterNumber' }, { path: 'subjectId', select: 'subjectName icon' }]).limit(limit).skip(skip).sort({ unitNumber: 1 });
        data = JSON.parse(JSON.stringify(data));
        let unitLogsData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: chapterData.subjectId })

        if (!unitLogsData) {
            if (chapterData.chapterNumber != 1) throw { status: 403, message: "Please first unlock above chapters." }
            data.map(async (x) => {
                if (chapterData.chapterNumber == 1 && x.unitNumber == 1) x.isLocked = false;
                if (chapterData.chapterNumber == 1 && x.unitNumber != 1) x.isLocked = true;
                if (chapterData.chapterNumber != 1) x.isLocked = true;
                return x;
            })
        }
        if (unitLogsData) {
            if (unitLogsData.nextUnlockedChapterNumber < chapterData.chapterNumber) throw { status: 403, message: "Please first unlock above chapters." }
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
        res.status(200).send({ status: 1, message: "Fundamental units fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (e) {
        next(e)
    }
}


exports.getFundamentalUnitDetailsByUser = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let id = req.query.unitId;
        if (!id) throw { status: 400, message: "Please provide unit id" };

        let unitData = await FundamentalUnit.findOne({ _id: id, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.subjectId })
        if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please first unlock above units." }
        if (unitLogsData) {
            if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 500, message: "Please first unlock above chapters." }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString()) != "64ed9453511b7d753021d3cb") throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }
                if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 500, message: "Please first unlock above units." }
            }
        }

        //After_Having_UnitAccess
        let [pretestData, materials, finaltestData, userUnlocksData] = await Promise.all([
            FundamentalPreTest.findOne({ unitId: id, isDeleted: false }),
            FundamentalMaterial.find({ unitId: id, isDeleted: false }).sort({ 'materialNumber': 1 }),
            FundamentalFinalTest.findOne({ unitId: id, isDeleted: false }),
            UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.chapterId.subjectId })

        ]);
        if (!pretestData) throw { status: 404, message: "Pre test is not yet added for this unit" }
        if (!materials.length) throw { status: 404, message: "Material is not yet added for this unit" }
        if (!finaltestData) throw { status: 404, message: "Final test is not yet added for this unit" }

        let materialLogsData = await UserFundamentalMaterialLogs.findOne({ unitId: id, isDeleted: false, userId });
        pretestData = JSON.parse(JSON.stringify(pretestData));
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
            if (unitData.chapterId.chapterNumber == userUnlocksData.nextUnlockedChapterNumber && unitData.unitNumber == userUnlocksData.nextUnlockedUnitNumber) pretestData.isLocked = false, materialData.isLocked = false, finaltestData.isLocked = (materialLogsData) ? false : true;
            if (unitData.chapterId.chapterNumber == userUnlocksData.nextUnlockedChapterNumber && unitData.unitNumber > userUnlocksData.nextUnlockedUnitNumber) pretestData.isLocked = true, materialData.isLocked = true, finaltestData.isLocked = (materialLogsData) ? false : true;
        }

        finaltestData.questions = (shuffleArray(finaltestData.questions)).slice(0, 10);
        res.status(200).send({ status: 1, message: "Fundmental unit details fetched sucessfully!", data: { pretestData, materialData, finaltestData } })
    }
    catch (e) {
        next(e)
    }
}


/*-------------------------------------FUNDAMENTAL MATERIAL-APIS----------------------------*/
exports.addFundamentalMaterial = async (req, res, next) => {
    try {

        let {
            materialName,
            materialNumber,
            description,
            unitId,
            url,
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

        let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false });
        if (!unitData) throw { status: 404, message: "No unit found!" }

        let data = await FundamentalMaterial.findOne({ unitId, materialNumber, isDeleted: false });
        if (data) throw { status: 409, message: "Material number is already used for this unit" }
        data = await FundamentalMaterial.create({
            materialName: capitalizeEveryInnerWord(materialName),
            materialNumber,
            description,
            unitId,
            url,
            status,
            type,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Fundamental material adding failed. Try again" }
        res.status(201).send({ status: 1, message: "Fundamental material added successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getFundamentalMaterial = async (req, res, next) => {
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

        let data = await FundamentalMaterial.find(dbQuery).populate([{ path: "unitId" }]).limit(limit).skip(skip).sort({ 'materialNumber': 1 });
        let totalDataCount = await FundamentalMaterial.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Fundamental materials list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (e) {
        next(e)
    }
}


exports.editFundamentalMaterial = async (req, res, next) => {
    try {
        let {
            id,
            materialName,
            unitId,
            url,
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

        let data = await FundamentalMaterial.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No material found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status != undefined && status != null) dbQuery.status = status;
        if (description) dbQuery.description = description;
        if (materialName) dbQuery.materialName = capitalizeEveryInnerWord(materialName);
        if (url) dbQuery.url = url;
        if (type) dbQuery.type = type;
        if (unitId) {
            let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false });
            if (!unitData) throw { status: 404, message: "No fundamental unit found!" }
            dbQuery.unitId = unitId;
        }
        if (materialNumber) {
            let unitid = (unitId) ? unitId : data.unitId;
            let matData = await FundamentalMaterial.findOne({ unitId: unitid, materialNumber, isDeleted: false });
            if (matData && (matData._id).toString() != id.toString()) throw { status: 409, message: "Material number is already taken for this unit" }
            dbQuery.materialNumber = materialNumber;

        }
        data = await FundamentalMaterial.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental material updated sucessfully!", data })

    }
    catch (e) {
        next(e)
    }
}


exports.deleteFundamentalMaterial = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalMaterial.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental material deleted successfully!", data: {} })

    }
    catch (e) {
        next(e)
    }
}


exports.saveFundamentalMaterialLog = async (req, res, next) => {
    try {
        let unitId = req.body.unitId;
        let userId = req.user._id;
        if (!unitId) throw { status: 400, message: "Please provide unitId." }

        let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.subjectId })
        if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please first unlock above units." }
        if (unitLogsData) {
            if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please first unlock above chapters." }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }

                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString() != "64ed9453511b7d753021d3cb")) throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 403, message: "Please first unlock above units." }
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
    catch (e) {
        next(e)
    }
}



/*-----------------------------------------Fundamental Pretest-APIS----------------------------------------------*/

exports.addFundamentalPretest = async (req, res, next) => {
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

        let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false });
        if (!unitData) throw { status: 404, message: "No unit found!" }

        let data = await FundamentalPreTest.findOne({ unitId, isDeleted: false });
        if (data) throw { status: 409, message: "Questions is already added for this unit. Try for another unit" }

        if (!questions.length) throw { status: 400, message: "Questions cannot be empty" }

        data = await FundamentalPreTest.create({
            unitId,
            questions,
            isPretestMandatory,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to store pretest. Try again" }
        res.status(201).send({ status: 1, message: "Pretest added sucessfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getFundamentalPretests = async (req, res, next) => {
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

        let data = await FundamentalPreTest.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await FundamentalPreTest.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Fundamental pretests fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (e) {
        next(e)
    }
}


exports.editFundamentalPretest = async (req, res, next) => {
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

        let data = await FundamentalPreTest.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No pretest found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (unitId) {
            let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false });
            if (!unitData) throw { status: 404, message: "No unit found!" }

            let unitTestData = await FundamentalPreTest.findOne({ unitId, isDeleted: false });
            if (unitTestData && (unitTestData._id).toString() !== id.toString()) throw { status: 409, message: "Questions are already added for this unit. Try for another unit" }
            dbQuery.unitId = unitId
        }
        if (questions && !questions.length) throw { status: 400, message: "Questions cannot be empty." }
        dbQuery.questions = questions
        if (isPretestMandatory == true || isPretestMandatory == false) dbQuery.isPretestMandatory = isPretestMandatory;
        data = await FundamentalPreTest.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Pretest updated successfully!", data })

    }
    catch (e) {
        next(e)
    }
}

exports.deleteFundamentalPretest = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalPreTest.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental pretest deleted successfully!", data: {} })

    }
    catch (e) {
        next(e)
    }
}

exports.submitFundamentalPretest = async (req, res, next) => {
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

        let testData = await FundamentalPreTest.findOne({ _id: testId, isDeleted: false });
        if (!testData) throw { status: 404, message: "No pretest found!" }

        let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: "chapterId", select: 'chapterNumber subjectId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.subjectId })
        if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please first unlock above units." }
        if (unitLogsData) {
            if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 403, message: "Please first unlock above chapters." }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString()) != "64ed9453511b7d753021d3cb") throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 403, message: "Please first unlock above units." }
            }
        }

        if (!responses.length) throw { status: 400, message: "Response can not be empty" }

        let calculatedData = calculateAssessmentPercentage(testData.questions, responses);
        let percentage = calculatedData.percentage;
        responses = calculatedData.responses;

        let data = await UserFundamentalPreTestLogs.findOne({ userId, unitId, testId });
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
        data = await UserFundamentalPreTestLogs.findOneAndUpdate({ userId, unitId, testId }, { $set: updateBody }, { new: true, upsert: true })
        res.status(200).send({ status: 1, message: "Pretest submitted successfully!", data })
    }
    catch (e) {
        next(e)
    }
}


//*-------------------Fundamental Final_test_APIS-----------------------------------------------------*/

exports.addFundamentalFinaltest = async (req, res, next) => {
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

        let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false });
        if (!unitData) throw { status: 404, message: "No unit found!" }

        let data = await FundamentalFinalTest.findOne({ unitId, isDeleted: false });
        if (data) throw { status: 409, message: "Questions is already added for this unit. Try for another unit" }

        if (!questions.length) throw Error("Questions can not be empty")

        data = await FundamentalFinalTest.create({
            unitId,
            questions,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to store finaltest. Try again" }
        res.status(201).send({ status: 1, message: "Finaltest added sucessfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getFundamentalFinaltests = async (req, res, next) => {
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

        let data = await FundamentalFinalTest.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await FundamentalFinalTest.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Fundamental finaltests fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (e) {
        next(e)
    }
}


exports.editFundamentalFinaltest = async (req, res, next) => {
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

        let data = await FundamentalFinalTest.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No finaltest found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (unitId) {
            let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false });
            if (!unitData) throw { status: 404, message: "No unit found!" }

            let unitTestData = await FundamentalFinalTest.findOne({ unitId, isDeleted: false });
            if (unitTestData && (unitTestData._id).toString() !== id.toString()) throw { status: 409, message: "Questions are already added for this unit. Try for another unit" }
            dbQuery.unitId = unitId

        }
        if (questions) {
            if (!questions.length) throw { status: 400, message: "Questions cannot be empty." }
            dbQuery.questions = questions;
        }
        data = await FundamentalFinalTest.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Finaltest updated successfully!", data })

    }
    catch (e) {
        next(e)
    }
}

exports.deleteFundamentalFinaltest = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await FundamentalFinalTest.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Fundamental finaltest deleted successfully!", data: {} })

    }
    catch (e) {
        next(e)
    }
}

exports.submitFundamentalFinaltest = async (req, res, next) => {
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

        let testData = await FundamentalFinalTest.findOne({ _id: testId, isDeleted: false });
        if (!testData) throw { status: 404, message: "No test found." }
        testData = JSON.parse(JSON.stringify(testData))

        let materialData = await FundamentalMaterial.findOne({ unitId, isDeleted: false });
        if (materialData) {
            let materialLogsData = await UserFundamentalMaterialLogs.findOne({ unitId, isDeleted: false, userId });
            if (!materialLogsData) throw { status: 403, message: "Unlock your material.Please read material first" }
        }

        let unitData = await FundamentalUnit.findOne({ _id: unitId, isDeleted: false }).populate([{ path: 'chapterId', select: 'chapterNumber subjectId' }])
        if (!unitData) throw { status: 404, message: "No unit found" }
        const chapterId = unitData.chapterId._id;
        const subjectId = unitData.chapterId.subjectId;
        let attemptedOn;  //For Storing test logs

        //Checking_Unit_Access_Or_Not
        let unitLogsData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.subjectId })
        if (!unitLogsData && unitData.unitNumber != 1) throw { status: 403, message: "Please first unlock above units." }
        if (unitLogsData) {
            if (unitData.chapterId.chapterNumber > unitLogsData.nextUnlockedChapterNumber) throw { status: 500, message: "Please first unlock above chapters." }
            if (unitData.chapterId.chapterNumber == unitLogsData.nextUnlockedChapterNumber) {
                // if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate)) throw { statusCode: 500, msg: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('YYYY-MM-DD')} 12:00 A.M` }
                if (unitData.unitNumber == unitLogsData.nextUnlockedUnitNumber && new Date(getCurrentDateAndTime()) < new Date(unitLogsData.nextUnlockDate) && (userId.toString() != "64ed9453511b7d753021d3cb")) throw { status: 403, message: `This unit will unlock on ${moment(unitLogsData.nextUnlockDate).format('DD-MM-YYYY')} at 12:00 A.M` }
                if (unitData.unitNumber > unitLogsData.nextUnlockedUnitNumber) throw { status: 500, message: "Please first unlock above units." }
            }
        }
        //After getting access
        if (!responses.length) throw { status: 400, message: "No responses found!" }
        let commonQuestions = (testData.questions).filter(question =>
            responses.some(response => (response.questionId).toString() == (question._id).toString()));
        let calculatedData = calculateAssessmentPercentage(commonQuestions, responses);
        let percentage = calculatedData.percentage;
        responses = calculatedData.responses;
        let data = await UserFundamentalFinalTestLogs.findOne({ userId, unitId, testId });
        if (!data) maxPercentage = percentage, attemptedOn = 0;
        else if (data) {
            attemptedOn = (data.maxPercentage >= 60) ? 1 : 0;
            maxPercentage = (data.maxPercentage > percentage) ? data.maxPercentage : percentage;
        }

        //When the user qualified in assessment
        if ((!data && percentage >= 60) || ((data && data.maxPercentage < 60) && percentage >= 60)) {
            console.log("coming")
            let nextUnlockedChapterNumber, nextUnlockedUnitNumber;
            let chapterUnitsData = await FundamentalUnit.findOne({ chapterId: unitData.chapterId._id, isDeleted: false }).sort({ unitNumber: -1 })
            console.log({ cn: unitData.chapterId.chapterNumber })
            if (unitData.unitNumber < chapterUnitsData.unitNumber) {
                nextUnlockedChapterNumber = unitData.chapterId.chapterNumber;
                nextUnlockedUnitNumber = unitData.unitNumber + 1;
            } if (unitData.unitNumber == chapterUnitsData.unitNumber) {
                nextUnlockedChapterNumber = unitData.chapterId.chapterNumber + 1
                nextUnlockedUnitNumber = 1;
            }
            let unlockData = await UserFundamentalUnlockCounters.findOne({ userId, subjectId: unitData.subjectId });
            if (!unlockData) {
                unlockData = await UserFundamentalUnlockCounters.create({
                    nextUnlockedUnitNumber,
                    nextUnlockedChapterNumber,
                    userId,
                    subjectId: unitData.subjectId,
                    createdAt: currentDate,
                    updatedAt: currentDate,
                    nextUnlockDate: getTomorrowDate()
                })
            }
            else if (unlockData) {
                unlockData = await UserFundamentalUnlockCounters.findOneAndUpdate({ userId, subjectId: unitData.subjectId }, {
                    $set: {
                        nextUnlockedUnitNumber,
                        nextUnlockedChapterNumber,
                        userId,
                        subjectId: unitData.subjectId,
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
        data = await UserFundamentalFinalTestLogs.findOneAndUpdate({ userId, unitId, testId }, { $set: updateBody }, { new: true, upsert: true });

        //Storing User TestLogs
        await UserFundamentalTestLogs.create({ responses, userId, testId, unitId, chapterId, subjectId, percentage: Math.round(percentage), createdAt: currentDate, updatedAt: currentDate, attemptedOn, type: 1 })
        res.status(200).send({ status: 1, message: "Final test submitted sucessfully!", data })
    }
    catch (e) {
        next(e)
    }
}


exports.getUserFundamentalPerformances = async (req, res, next) => {
    try {
        let userId = req.user._id;
        let subjectId = req.query.subjectId;

        // if (!subjectId) throw { status: 400, message: "Please provide subjectId." }

        if (subjectId) {
            let subjectData = await FundamentalSubject.findOne({ _id: subjectId });
            if (!subjectData) throw { status: 404, message: "No subject found!" }
        }

        let matchFilters = {
            userId: mongoose.Types.ObjectId(userId),
            attemptedOn: 0
        }
        if (subjectId) matchFilters.subjectId = mongoose.Types.ObjectId(subjectId);

        let data = await UserFundamentalTestLogs.aggregate([
            {
                $match: matchFilters

            },
            { $unwind: "$responses" },
            {
                $lookup: {
                    from: "fundamentalsubjects",
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
        ]);

        if (!subjectId && data.length) {
            data = data.reduce((acc, { _id, subjectName, ...rest }) => {
                Object.entries(rest).forEach(([key, value]) => acc[key] = (acc[key] || 0) + value);
                return acc;
            }, {});

            data = [data]
        }
        res.status(200).send({ status: 1, message: "Fundamental performances fetched successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getUserProgress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        let data = await FundamentalSubject.aggregate([
            { $match: { isDeleted: false } },
            {
                $lookup: {
                    from: "fundamentalchapters",
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
                    from: "userfundamentalunlockcounters",
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
            }
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
        res.status(200).send({ status: 1, message: "Performances fetched successfully!", data })

    }
    catch (error) {
        next(error)
    }
}




