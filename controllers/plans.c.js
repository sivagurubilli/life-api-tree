let { capitalizeEveryInnerWord, isRequestDataValid } = require('../utils/appUtils');
let { User, Plans, Category } = require('../models')
const { getCurrentDateAndTime, getTomorrowDate } = require("../helpers/dates");

exports.addPlans = async (req, res, next) => {
    try {
        let {
            name,
            type,
            validityInDays,
            price,
            description,
            status,
            directReferralPoints,
            referralProgram,
            maxCourse,
            currentDate, categoryId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            name,
            type,
            validityInDays,
            price,
            status,
            directReferralPoints,
            referralProgram,
            maxCourse,
            categoryId,
            description
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (price < 0 || type < 0 || validityInDays < 0 || status < 0 || maxCourse < 0) throw { status: 400, message: "Negative values cannot be accepted." }
        if (!categoryId.length) throw { status: 400, message: "Please provide atleast one category." }
        currentDate = getCurrentDateAndTime();

        let categoryData = await Category.find({ isDeleted: false, _id: { $in: categoryId } }).countDocuments();
        if (categoryId.length != categoryData) throw { status: 400, message: "Please provide a valid categories." }
        let data = await Plans.create({
            name: capitalizeEveryInnerWord(name),
            type,
            validityInDays,
            price,
            description,
            status,
            directReferralPoints,
            categoryId,
            referralProgram,
            maxCourse,
            createdAt: currentDate, updatedAt: currentDate
        });
        if (!data) throw { status: 500, message: "Unable to add plans. Try again" }
        res.status(200).send({ status: 1, message: "Plan added successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getPlansList = async (req, res, next) => {
    try {
        let {
            id,
            status, categoryId,
            upgrade,
            limit, skip, page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (upgrade == 1) dbQuery.upgradePlan = true;
        if (categoryId) dbQuery.categoryId = { $in: [categoryId] }
        if (status) dbQuery.status = status;
        let paginatedData = await Plans.find(dbQuery).populate([{ path: 'categoryId', select: 'name status' }]).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await Plans.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Plans list fetched successfully", currentPageCount: paginatedData.length, totalDataCount, paginatedData })

    }
    catch (e) {
        next(e)
    }
}

exports.getUpgradePlansList = async (req, res, next) => {
    try {
        let {
            id,
            status, categoryId,
            upgrade,
            limit, skip, page

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (req.user.status != 4 || req.user.maxCourse > 1) throw { status: 403, message: "Your account is currently not available for upgrade!" }

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = { isDeleted: false, upgradePlan: true };
        if (id) dbQuery._id = id;
        if (upgrade == 1) dbQuery.upgradePlan = true;
        if (categoryId) dbQuery.categoryId = { $in: [categoryId] }
        if (status) dbQuery.status = status;
        let paginatedData = await Plans.find(dbQuery).populate([{ path: 'categoryId', select: 'name status' }]).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await Plans.find(dbQuery).countDocuments();
        paginatedData = JSON.parse(JSON.stringify(paginatedData));
        paginatedData = paginatedData.map((x) => {
            x.price = parseInt(x.price) - 499;
            return x;
        })
        res.status(200).send({ status: 1, message: "Plans list fetched successfully", currentPageCount: paginatedData.length, totalDataCount, paginatedData })

    }
    catch (error) {
        next(error)
    }
}


exports.editPlan = async (req, res, next) => {
    try {
        let {
            id,
            name,
            type,
            validityInDays,
            price,
            description,
            status,
            directReferralPoints,
            referralProgram,
            maxCourse,
            categoryId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Plans.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No plan found." }

        let updateBody = { updatedAt: getCurrentDateAndTime() };
        if (description) updateBody.description = description;
        if (name) updateBody.name = capitalizeEveryInnerWord(name);
        if (type !== null && type !== undefined) updateBody.type = type;
        if (validityInDays !== null && validityInDays !== undefined) updateBody.validityInDays = validityInDays;
        if (price !== null && price !== undefined) updateBody.price = price;
        if (status !== null && status !== undefined) updateBody.status = status;
        if (directReferralPoints !== null && directReferralPoints !== undefined) updateBody.directReferralPoints = directReferralPoints;
        if (maxCourse !== null && maxCourse !== undefined) updateBody.maxCourse = maxCourse;
        if (referralProgram !== null && referralProgram !== undefined) updateBody.referralProgram = referralProgram;
        if (categoryId && categoryId.length) {
            let categoryData = await Category.find({ isDeleted: false, _id: { $in: categoryId } }).countDocuments();
            if (categoryId.length != categoryData) throw { status: 400, message: "Please provide a valid categories." }
            updateBody.categoryId = categoryId;
        }

        data = await Plans.findOneAndUpdate({ _id: id }, { $set: updateBody }, { new: true });
        res.status(200).send({ status: 1, message: "Plan updated successfully", data })

    }
    catch (e) {
        next(e)
    }
}


exports.deletePlan = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Plans.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Plan deleted successfully", data: {} })

    }
    catch (e) {
        next(e)
    }
}
