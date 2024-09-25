const mongoose = require("mongoose");
let { privateKey, adminEmail } = require('../config/config')
let { generateAge, generateReferralCode, capitalizeEveryInnerWord, generateSlotNumberWithchildSlotPosition, fetchChildSlotPosition, fetchNextAvailableSlotPosition, generateSlotNumber, responseJson, sendMail, isRequestDataValid, logger, sendOtp, sendOtpOld, generateOtp } = require('../utils/appUtils');
let { Plans, Assessment, UserActivityLogs, Tickets, Issues, User, Category, Course, Payment, VisitorCurrentAffairLogs, Visitor, QuizCategory, QuizContent, Challenges } = require('../models')
const jwt = require('jsonwebtoken')
const { getCurrentDateAndTime, getTomorrowDate, getAddedNextDate, addDaysToDate } = require("../helpers/dates");
const { generateAccessToken, generateRefreshToken, validateUserAccessToken } = require("../middlewares/authToken.js")
const moment = require('moment');
const { generateHourlyData } = require("../helpers/user");

exports.adminLogin = async (req, res, next) => {
    try {
        let {
            email,
            password
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            email,
            password
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await User.findOne({ email, isDeleted: false }).lean();
        if (!data) throw { status: 404, message: "No account found.Try again" }
        if (password !== data.password) throw { status: 400, message: "Password incorrect.Try again" }

        data.accessToken = generateAccessToken(data);
        data.refreshToken = generateRefreshToken(data);

        res.status(200).send({ status: 1, message: "Logged in successfully", data })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchAdminProfile = async (req, res, next) => {
    try {
        let data = req.user;
        res.status(200).send({ status: 1, message: "Profile fetched successfully!", data })
    }
    catch (e) {
        next(e)
    }
}

exports.addCategory = async (req, res, next) => {
    try {

        let {
            name,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            status,
            name
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (status != "active" && status != "inactive") throw { status: 400, message: "Please provide a valid status" }

        let data = await Category.create({
            name: capitalizeEveryInnerWord(name),
            status,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { status: 500, message: "Unable to add category.Try again" }
        res.status(200).send({ status: 1, message: "Category added successfully!", data })
    }
    catch (e) {
        res.status(e.statusCode || 500).send({ status: 0, message: e.message || "Internal server error" })
    }
}

exports.getCategoryList = async (req, res, next) => {
    try {
        let {
            id,
            status,
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
        if (status) dbQuery.status = status;
        let paginatedData = await Category.find(dbQuery).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await Category.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Categories list fetched successfully", currentPageCount: paginatedData.length, totalDataCount, paginatedData })

    }
    catch (e) {
        next(e)
    }
}


exports.editCategory = async (req, res, next) => {
    try {
        let {
            id,
            name,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Category.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No category found." }

        let updateBody = { updatedAt: getCurrentDateAndTime() };
        if (status) updateBody.status = status;
        if (name) updateBody.name = capitalizeEveryInnerWord(name);
        data = await Category.findOneAndUpdate({ _id: id }, { $set: updateBody }, { new: true });
        res.status(200).send({ status: 1, message: "Category updated successfully", data })

    }
    catch (e) {
        next(e)
    }
}


exports.deleteCategory = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Category.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Category deleted successfully", data: {} })

    }
    catch (e) {
        next(e)
    }
}

exports.addCourse = async (req, res, next) => {
    try {

        let {
            courseName,
            icon,
            status,
            type,
            categoryId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            courseName,
            icon,
            status,
            type,
            categoryId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let course = await Category.findOne({ _id: categoryId, isDeleted: false })
        if (!course) throw { status: 404, message: "No category found!" }

        let data = await Course.findOne({ courseName: capitalizeEveryInnerWord(courseName), categoryId }).lean();
        if (data) throw { status: 409, message: "This course is already added for this category. Try with another!" }

        data = await Course.create({
            courseName: capitalizeEveryInnerWord(courseName),
            icon,
            status,
            type,
            categoryId,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { status: 500, message: "Unable to add course.Try again" }
        res.status(200).send({ status: 1, message: "Course added successfully", data })
    }
    catch (e) {
        next(e)
    }
}

exports.getCoursesList = async (req, res, next) => {
    try {
        let {
            id,
            courseName,
            type,
            status,
            limit,
            skip,
            page,
            categoryId

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
        if (status) dbQuery.status = status;
        if (courseName) dbQuery.courseName = courseName;
        if (type) dbQuery.type = type;
        if (categoryId) {
            let category = await Category.findOne({ _id: categoryId, isDeleted: false })
            if (!category) throw { status: 404, message: "No category found!" }
            dbQuery.categoryId = categoryId;
        }
        let paginatedData = await Course.find(dbQuery).populate([{ path: 'categoryId', select: 'name status' }]).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await Course.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Courses fetched successfully", currentPageCount: paginatedData.length, totalDataCount, data: paginatedData })

    }
    catch (e) {
        next(e)
    }
}


exports.editCourse = async (req, res, next) => {
    try {
        let {
            id,
            courseName,
            type,
            status,
            icon,
            categoryId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Course.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No course found" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (status) dbQuery.status = status;
        if (courseName) dbQuery.courseName = capitalizeEveryInnerWord(courseName);
        if (type) dbQuery.type = type;
        if (icon) dbQuery.icon = icon;
        if (categoryId) {
            let course = await Category.findOne({ _id: categoryId, isDeleted: false })
            if (!course) throw { status: 404, message: "No category found!" }
        }

        data = await Course.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Course updated successfully", data })

    }
    catch (e) {
        next(e)
    }
}


exports.deleteCourse = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Course.findOneAndUpdate({ _id: id }, {
            $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() }
        }, { new: true });
        res.status(200).send({ status: 1, message: "Course deleted successfully", data: {} })

    }
    catch (e) {
        next(e)
    }
}

exports.getUsersList = async (req, res, next) => {
    try {
        let {
            userType,
            limit, page, skip

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            userType
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        let dbQuery = { isVerified: true, isDeleted: false, level: { $gt: 4 } }
        if (userType == "paid") dbQuery.status = { $in: [3, 4] }
        else if (userType == "unpaid") dbQuery.status = { $in: [1, 2] }
        else throw { status: 400, message: "Please provide a valid userType" }

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let totalDataCount = await User.find(dbQuery).countDocuments();
        let paginatedData = await User.find(dbQuery).populate([{ path: "sponsorId", select: "name email mobileNo sponsorCode" }]).select('-refreshToken -accessToken').limit(limit).skip(skip).sort({ createdAt: -1 }).lean();
        res.status(200).send({ status: 1, message: "Users fetched successfully", totalDataCount, currentPageCount: paginatedData.length, data: paginatedData })

    }
    catch (error) {
        next(error)
    }
}

exports.getUserDetails = async (req, res, next) => {
    try {
        let {
            userId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            userId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await User.findOne({ _id: userId }).populate([{ path: "sponsorId", select: "name email mobileNo sponsorCode" }]).select('-refreshToken -accessToken').lean();
        if (!data) throw { status: 404, message: "No user found!" }
        data = JSON.parse(JSON.stringify(data));
        data.totalPaidReferralsCount = await User.find({ sponsorId: userId, status: { $in: [3, 4] }, isVerified: true }).countDocuments();
        data.totalUnpaidReferralsCount = await User.find({ sponsorId: userId, status: { $in: [1, 2] }, isVerified: true }).countDocuments();
        res.status(200).send({ status: 1, message: "User details fetched successfully", data })

    }
    catch (error) {
        next(error)
    }
}

exports.fetchUserPayments = async (req, res, next) => {
    try {

        let {
            id,
            userId,
            startDate,
            planId,
            endDate, status,
            limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        status = (status == 0) ? 0 : (status == 1) ? 1 : 1;

        let dbQuery = { paymentStatus: status }
        if (id) dbQuery._id = id;
        if (userId) dbQuery.userId = userId;
        if (startDate && endDate) dbQuery.createdAt = {
            $gte: `${startDate}T00:00:00.000Z`,
            $lte: `${endDate}T23:59:59.000Z`
        }
        if (planId) dbQuery.planId = planId;

        let paginatedData = await Payment.find(dbQuery).populate([
            { path: 'userId', select: 'name email referralCode mobileNo planStartsAt planExpiresAt referralCode' },
            { path: 'planId', select: '-createdAt -updatedAt -categoryId' }
        ]).sort({ 'createdAt': -1 }).limit(limit).skip(skip);
        let totalDataCount = await Payment.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Payments list fetched successfully", totalDataCount, currentPageCount: paginatedData.length, data: paginatedData })
    }
    catch (error) {
        next(error)
    }
}

//Issues-APIS
exports.addIssues = async (req, res, next) => {
    try {

        let {
            name,
            icon,
            status

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            name,
            icon,
            status
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Issues.create({
            name,
            icon,
            status,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw Error("Unable to store issues.Try again")
        res.status(201).send({ status: 1, message: "Issue added successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.editIssues = async (req, res, next) => {
    try {

        let {
            name,
            icon,
            status,
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Issues.findOne({ _id: id });
        if (!data) throw { status: 404, message: "No issue found!" }

        let updateBody = { updatedAt: getCurrentDateAndTime() };
        if (name) updateBody.name = name;
        if (icon) updateBody.icon = icon;
        if (status == 0 || status == 1) updateBody.status = status;

        data = await Issues.findOneAndUpdate({ _id: id }, {
            $set: updateBody
        }, { new: true });
        if (!data) throw Error("Unable to update issues.Try again")

        res.status(200).send({ status: 1, message: "Issue edited successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.deleteIssues = async (req, res, next) => {
    try {

        let {
            id
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        data = await Issues.findOneAndDelete({ _id: id })
        res.status(200).send({ status: 1, message: "Issue deleted successfully!", data: {} })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchIssues = async (req, res, next) => {
    try {

        let {
            id,
            limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = {};
        if (id) dbQuery._id = id;
        let data = await Issues.find(dbQuery).limit(limit).skip(skip);
        let totalDataCount = await Issues.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Issues fetched successfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}


//Tickets_api
exports.createTicket = async (req, res, next) => {
    try {

        let {
            issueId,
            description,
            ticketNumber,
            issueSubject

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            issueId,
            description,
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let issuedata = await Issues.findOne({ _id: issueId });
        if (!issuedata) throw { status: 404, message: "No issue found" }
        let userId = req.user._id;

        //Invoice Number generation
        let lastRecord = await Tickets.find({ isDeleted: false }).sort({ _id: -1 }).limit(1);
        //Calculating Current Invoice Number
        let lastTicketNumber;
        let ticketCode = 'TR';
        if (lastRecord.length && lastRecord[0]['ticketNumber']) {
            ticketCode = (lastRecord[0].ticketNumber).substring(0, 2);
            lastTicketNumber = (lastRecord[0].ticketNumber).substring(2);
        }
        else {
            lastTicketNumber = 0;
        }
        if (lastTicketNumber == undefined) throw Error("Unable to generate ticket number.Try again")
        ticketNumber = parseInt(lastTicketNumber) + 1;
        ticketNumber = ticketNumber.toString().padStart(8, "0")
        ticketNumber = `${ticketCode}${ticketNumber}`
        if (!ticketNumber) throw Error("ticketNumber not generated.Try again")

        let data = await Tickets.create({
            issueId,
            userId,
            description,
            ticketNumber,
            issueSubject: (issueSubject) ? issueSubject : issuedata.name,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });

        if (!data) throw Error("Unable to create ticket.Try again")
        if (req.user.email) {
            sendMail({
                to: req.user.name,
                subject: `New issue request raised`,
                type: 'openticket',
                options: {
                    name: req.user.name,
                    ticketNumber
                }
            })
        }
        res.status(201).send({ status: 1, message: "Ticket created successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.closeTicket = async (req, res, next) => {
    try {

        let {
            id,
            resolution

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id,
            resolution
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Tickets.findOne({ _id: id }).populate([{ path: 'userId', select: 'email name firebaseToken' }])
        if (!data) throw { status: 404, message: "No ticket found!" }
        let userEmail = data.userId.email;
        let userName = data.userId.name;
        data = await Tickets.findOneAndUpdate({ _id: id }, {
            $set: {
                resolution, status: 'closed', updatedAt: getCurrentDateAndTime()
            }
        }, { new: true });
        sendMail({
            to: userEmail,
            subject: `Issue resolved`,
            type: 'closedticket',
            options: {
                name: userName,
                ticketNumber: data.ticketNumber
            }
        })
        res.status(200).send({ status: 1, message: "Ticket closed successfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchTicketsListByAdmin = async (req, res, next) => {
    try {

        let {
            id,
            issueId,
            userId,
            status,
            ticketNumber, limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);


        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = {};
        if (id) dbQuery._id = id;
        if (issueId) dbQuery.issueId = issueId;
        if (userId) dbQuery.userId = userId;
        if (status) dbQuery.status = status;
        if (ticketNumber) dbQuery.ticketNumber = ticketNumber;
        let data = await Tickets.find(dbQuery).populate([{ path: 'issueId', select: 'name icon' }, { path: 'userId', select: 'name email mobileNo profileImageUrl referralCode' }]).sort({ '_id': -1 }).limit(limit).skip(skip);
        let totalDataCount = await Tickets.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Tickets list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}

exports.fetchTicketsListByUser = async (req, res, next) => {
    try {

        let {
            id,
            issueId,
            status,
            ticketNumber, limit, page, skip
        } = Object.assign(req.body, req.query, req.params)


        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = { userId: req.user._id };
        if (id) dbQuery._id = id;
        if (issueId) dbQuery.issueId = issueId;
        if (status) dbQuery.status = status;
        if (ticketNumber) dbQuery.ticketNumber = ticketNumber;
        let data = await Tickets.find(dbQuery).populate([{ path: 'issueId', select: 'name icon' }]).sort({ '_id': -1 }).limit(limit).skip(skip);
        let totalDataCount = await Tickets.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Tickets list fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}

exports.fetchTicketStatistics = async (req, res, next) => {
    try {

        let {
            id
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let dbQuery = [];
        if (id) {
            dbQuery.push(
                {
                    $match: { _id: mongoose.Types.ObjectId(id) }
                },
            )
        }
        dbQuery.push(
            {
                $lookup: {
                    from: 'tickets',
                    localField: '_id',
                    foreignField: 'issueId',
                    as: 'tickets'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    icon: 1,
                    status: 1,
                    totalTickets: { $size: "$tickets" },
                    openTicketsCount: {
                        $size: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: { $eq: ["$$ticket.status", "open"] }
                            }
                        }
                    },
                    closedTicketsCount: {
                        $size: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: { $eq: ["$$ticket.status", "closed"] }
                            }
                        }
                    }
                }
            }
        )
        let data = await Issues.aggregate(dbQuery);
        res.status(200).send({ status: 1, message: "Issues statistics fetched successfully", data })

    }
    catch (error) {
        next(error)
    }
}

exports.getVisitiorsList = async (req, res, next) => {
    try {

        let {
            limit, skip, page,
            id
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);


        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = {};
        if (id) dbQuery._id = id;
        let data = await Visitor.find(dbQuery).sort({ createdAt: -1 }).limit(limit).skip(skip);
        let totalDataCount = await Visitor.find(dbQuery).countDocuments();
        res.status(200).send({ status: 1, message: "Visitors fetched successfully!", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}

exports.getVisitorCurrentAffairLogs = async (req, res) => {
    try {
        let {
            visitorId,
            date, id,
            limit, skip, page
        } = Object.assign(req.body, req.query, req.params)

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);

        let dbQuery = {};
        if (id) dbQuery._id = id;
        if (visitorId) dbQuery.visitorId = visitorId;
        let totalDataCount = await VisitorCurrentAffairLogs.find(dbQuery).countDocuments();
        let data = await VisitorCurrentAffairLogs.find(dbQuery).populate([{ path: "visitorId" }, { path: "currentAffairsId" }]).sort({ createdAt: -1 }).limit(limit).skip(skip);
        res.status(200).send({ status: 1, message: "Logs fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}

/*------------------------------------QUIZ-APIS-------------------------------*/
exports.addQuizCategory = async (req, res, next) => {
    try {

        let {
            name,
            icon

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            name,
            icon
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await QuizCategory.create({
            name: capitalizeEveryInnerWord(name),
            icon,
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

        let data = await QuizCategory.find(dbQuery).limit(limit).skip(skip);
        let totalDataCount = await QuizCategory.find(dbQuery).countDocuments();

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
            icon

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await QuizCategory.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No Quiz Category found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (name) dbQuery.name = capitalizeEveryInnerWord(name);
        if (icon) dbQuery.icon = icon;

        data = await QuizCategory.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
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

        let data = await QuizCategory.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
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
            date
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            quizCategoryId,
            content,
            date
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let categoryData = await QuizCategory.findOne({ _id: quizCategoryId, isDeleted: false });
        if (!categoryData) throw { status: 404, message: "No quiz category found!" }

        let data = await QuizContent.findOne({ quizCategoryId, date, isDeleted: false });
        if (data) throw { status: 409, message: "Quiz Content is already added for this date on this Quiz category . Try another!" }

        data = await QuizContent.create({
            quizCategoryId,
            content,
            date,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
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
        let data = await QuizContent.find(dbQuery).populate([{ path: 'quizCategoryId', select: 'name icon' }]).limit(limit).skip(skip).sort({ date: -1 });
        let totalDataCount = await QuizContent.find(dbQuery).countDocuments();

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
            date

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id,
            quizCategoryId,
            content,
            date
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await QuizContent.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No quiz content found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (content) dbQuery.content = content;
        if (date && quizCategoryId) {
            let categoryData = await QuizCategory.findOne({ _id: quizCategoryId, isDeleted: false });
            if (!categoryData) throw { status: 404, message: "No quiz category found!" }
            let contentData = await QuizContent.findOne({ quizCategoryId, date, isDeleted: false });
            if (contentData && contentData._id.toString() != id.toString()) throw { status: 409, message: "Quiz content is already for same date and category. Try another" }
            dbQuery.date = date;
            dbQuery.quizCategoryId = quizCategoryId;
        }
        data = await QuizContent.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Quiz content edited successfully!", data })

    }
    catch (error) {
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

        let data = await QuizContent.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: { isDeleted: true, updatedAt: getCurrentDateAndTime() } }, { new: true });
        if (!data) throw { status: 404, message: "No quiz content found!" }
        res.status(200).send({ status: 1, message: "Quiz content deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}


exports.fetchUserActivityLogs = async (req, res, next) => {
    try {

        let {
            id, activity, userId,
            date, limit, page, skip

        } = Object.assign(req.body, req.query, req.params)

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1);


        let dbQuery = {};
        if (id) dbQuery._id = id;
        if (userId) dbQuery.userId = userId;
        if (activity) dbQuery.activity = activity.trim();
        if (date) {
            date = moment(date).format('YYYY-MM-DD');
            dbQuery.createdAt = {
                $gte: `${date}T00:00:00.000Z`,
                $lte: `${date}T23:59:59.000Z`
            }
        }

        let paginatedData = await UserActivityLogs.find(dbQuery).populate([{ path: "userId", select: "name email mobileNo status maxCourse level slotNumber referralCode sponsorId sponsorCode" }])
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });
        let totalDataCount = await UserActivityLogs.find(dbQuery).countDocuments();
        let totalHourlyData = [];
        if (date) {
            let totalData = await UserActivityLogs.find(dbQuery);
            totalHourlyData = generateHourlyData(totalData);
        }

        res.status(200).send({ status: 1, message: "User activities fetched successfully!", totalDataCount, currentPageCount: paginatedData.length, data: paginatedData, totalHourlyData })

    }
    catch (error) {
        next(error)
    }
}


//Assessment_APIS
exports.addAssessment = async (req, res, next) => {
    try {

        let {
            questions,
            challengeId

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            questions,
            challengeId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Challenges.findOne({ _id: challengeId, isDeleted: false });
        if (!data) throw { status: 404, message: "No challenge found!" }
        if (!questions.length) throw Error("Questions can not be empty.")

        data = await Assessment.create({
            courseId: data.courseId,
            challengeId,
            questions,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        });
        if (!data) throw { message: "Unable to add assessment. Try again" }
        res.status(201).send({ status: 1, message: "Assessment added sucessfully!", data })
    }
    catch (error) {
        next(error)
    }
}

exports.getAssessments = async (req, res, next) => {
    try {
        let {
            id,
            courseId,
            challengeId,
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
        if (challengeId) dbQuery.challengeId = challengeId;

        let data = await Assessment.find(dbQuery).populate([{ path: 'challengeId', select: '-createdAt -updatedAt' }, { path: 'courseId', select: 'courseName icon' }]).limit(limit).skip(skip).sort({ _id: -1 });
        let totalDataCount = await Assessment.find(dbQuery).countDocuments();

        res.status(200).send({ status: 1, message: "Assessments fetched successfully!", totalDataCount, currentPageCount: data.length, data })

    }
    catch (error) {
        next(error)
    }
}


exports.editAssessment = async (req, res, next) => {
    try {
        let {
            id,
            challengeId, questions, isPretestMandatory

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Assessment.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No assessment found!" }

        let dbQuery = { updatedAt: getCurrentDateAndTime() };
        if (challengeId) {
            let challengeData = await Challenges.findOne({ _id: challengeId, isDeleted: false });
            if (!challengeData) throw { status: 404, message: "No challenge found!" }
            dbQuery.challengeId = challengeId;
            dbQuery.courseId = challengeData.courseId;
        }
        if (questions) {
            if (!questions.length) throw { status: 400, message: "Questions cannot be empty." }
            dbQuery.questions = questions;
        }
        data = await Assessment.findOneAndUpdate({ _id: id }, { $set: dbQuery }, { new: true });
        res.status(200).send({ status: 1, message: "Assessment updated successfully!", data })

    }
    catch (error) {
        next(error)
    }
}

exports.deleteAssessment = async (req, res, next) => {
    try {
        let {
            id

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let data = await Assessment.findOne({ _id: id, isDeleted: false });
        if (!data) throw { status: 404, message: "No assessment found!" }

        data = await Assessment.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
        res.status(200).send({ status: 1, message: "Assessment deleted successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}

//Admin-Challenge-Apis
exports.addChallenge = async (req, res, next) => {
    try {
        let {
            courseId,
            title,
            startDate,
            lastDate,
            endDate,
            rules,
            type


        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            courseId,
            title,
            startDate,
            lastDate,
            endDate,
            rules
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (type && type != 1 && type != 2 && type != 3) throw { status: 400, message: "Please provide a valid type" }

        let courseData = await Course.findOne({ _id: courseId, isDeleted: false });
        if (!courseData) throw { status: 404, message: "No course found" }

        endDate = `${endDate}T23:59:59.000Z`
        let resultsOutDate = getAddedNextDate(endDate, 29);
        resultsOutDate = resultsOutDate.split('T')[0];
        console.log({ resultsOutDate, endDate })

        let data = await Challenges.create({
            categoryId: courseData.categoryId,
            courseId,
            type,
            title,
            startDate,
            lastDate: `${lastDate}T23:59:59.000Z`,
            endDate,
            resultsOutDate,
            rules,
            createdAt: getCurrentDateAndTime(),
            updatedAt: getCurrentDateAndTime()
        })
        if (!data) throw { message: "Unable to add challenge. Try again" }
        res.status(201).send({ status: 1, message: "Challenge added successfully!", data: data })
    }
    catch (error) {
        console.log({ error })
        next(error)
    }

}

exports.getChallengesList = async (req, res, next) => {
    try {
        let {
            courseId,
            id, limit, page, skip, type
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {

        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 50
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        if (type && type != 1 && type != 2 && type != 3) throw { status: 400, message: "Please provide a valid type" }

        let dbQuery = { isDeleted: false };
        if (id) dbQuery._id = id;
        if (courseId) dbQuery.courseId = courseId;
        if (type) dbQuery.type = type;

        let totalDataCount = await Challenges.find(dbQuery).countDocuments();
        let data = await Challenges.find(dbQuery).populate([
            { path: 'courseId', select: 'courseName icon type' },
            { path: 'categoryId', select: 'name' }
        ]).limit(limit).skip(skip);
        data = JSON.parse(JSON.stringify(data));
        if (data.length) {
            data = data.map((x) => {
                if (new Date(x.startDate) > new Date(getCurrentDateAndTime())) x.status = 0
                else if (new Date(x.startDate) < new Date(getCurrentDateAndTime()) && new Date(x.endDate) > new Date(getCurrentDateAndTime())) x.status = 1
                else if (new Date(x.startDate) < new Date(getCurrentDateAndTime()) && new Date(x.endDate) < new Date(getCurrentDateAndTime())) x.status = 2
                return x;
            })
        }

        res.status(200).send({ status: 1, message: "Challenges list fetched successfully", totalDataCount, currentPageCount: data.length, data })
    }
    catch (error) {
        next(error)
    }
}


//Admin-Challenge-Apis
exports.editChallenge = async (req, res, next) => {
    try {
        let {
            id,
            title,
            startDate,
            lastDate,
            endDate,
            rules
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            id
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        let challengeData = await Challenges.findOne({ _id: id, isDeleted: false });
        if (!challengeData) throw { status: 404, message: "No challenge found" }

        let updateBody = {};
        if (title) updateBody.title = title;
        if (rules) updateBody.rules = rules;
        if (startDate) updateBody.startDate = startDate;
        if (lastDate) updateBody.lastDate = `${lastDate}T23:59:59.000Z`;
        if (endDate) {
            endDate = `${endDate}T23:59:59.000Z`;
            updateBody.endDate = endDate;
            let resultsOutDate = getAddedNextDate(endDate, 29);
            updateBody.resultsOutDate = resultsOutDate.split('T')[0];
        }

        challengeData = await Challenges.findOneAndUpdate({ _id: id }, { $set: updateBody }, { new: true })
        res.status(201).send({ status: 1, message: "Challenge updated successfully!", data: challengeData })
    }
    catch (error) {
        next(error)
    }

}

exports.assignPlanToUsers = async (req, res, next) => {
    try {
        let {
            userId,
            planId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            userId,
            planId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        const userData = await User.findOne({ _id: userId });
        if (!userData) throw { status: 404, message: "No user found" }
        if (userData.status == 4) throw { status: 403, message: "This user is already having an active plan." }

        const planData = await Plans.findOne({ isDeleted: false, _id: planId });
        if (!planData) throw { status: 404, message: "No plan found." }
        if (planData && planData.status == 0) throw { status: 404, message: "The requested plan is currently inactive." }

        //Alloting plan to users;
        const currentDate = getCurrentDateAndTime();
        const invoiceCode = 'LM';
        const invoiceNumber = `${invoiceCode}${Math.floor(Date.now() / 1000)}`;
        let planStartsAt = moment(currentDate).format("YYYY-MM-DD");
        planStartsAt = `${planStartsAt}T00:00:00.000Z`;
        let planExpiresAt = moment(addDaysToDate(parseInt(planData.validityInDays))).format('YYYY-MM-DD')
        planExpiresAt = `${planExpiresAt}T23:59:00.000Z`;

        let paymentUpdateBody = {
            paymentStatus: 1,
            updatedAt: currentDate,
            createdAt: currentDate,
            invoiceNumber,
            planStartsAt,
            planExpiresAt,
            userId,
            planId,
            amount: planData.price,
            isSelfPurchased: false
        };

        let userUpdateBody = { updatedAt: currentDate };
        if (planData.maxCourse) userUpdateBody.maxCourse = planData.maxCourse;
        if (planData.referralProgram) userUpdateBody.referralProgram = planData.referralProgram, userUpdateBody.status = 4, paymentUpdateBody.directReferralPoints = planData.directReferralPoints;

        // console.log({ userUpdateBody, paymentUpdateBody })
        const paymentData = await Payment.create(paymentUpdateBody);
        if (!paymentData) throw { status: 422, message: "Assigning plan to user failed. Try again" }

        await User.findOneAndUpdate({ _id: userId }, { $set: { ...userUpdateBody, paymentId: paymentData._id } }, { new: true })
        res.status(201).send({ status: 1, message: "Plan assigned to user successfully", data: {} })

    }
    catch (error) {
        next(error)
    }
}

