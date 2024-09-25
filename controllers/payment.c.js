const moment = require('moment');
let appUtils = require('../utils/appUtils')
let { toWords, responseJson, sendMail, isRequestDataValid, isActiveSubscriber } = appUtils
let { Course, WalletHistory, Payment, User, Role, Otp, Plans, EndorsedUsers, BasicLevel, PendingEndorsedUsers, UserCourse } = require('../models')
const mongoose = require("mongoose");
const { backendUrl, frontendUrl } = require("../config/config");
const { generateUserLevelAndSlots, fetchParentsData, generateEndorsedLevelAndSlots, fetchEndorsedParentsData, allotEndorsedParent } = require("./treeManagement.c");
let { razorpay } = require('../config/config.js')
const { getCurrentDateAndTime, getTomorrowDate, addDaysToDate } = require("../helpers/dates");

//Initiate_RazorPay_Payments
exports.createRzpPayment = async (req, res, next) => {

    try {

        let {
            planId,
            currentDate

        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            planId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        if (req.user.status == 4) throw { status: 403, message: "Your account is already having an active plan." }
        currentDate = getCurrentDateAndTime();
        const planData = await Plans.findOne({ isDeleted: false, _id: planId });
        if (!planData) throw { status: 404, message: "No plan found." }
        if (planData && planData.status == 0) throw { status: 404, message: "The requested plan is currently inactive." }


        amount = parseInt(planData.price) * 100;
        currency = "INR"

        let rzpOrder = await razorpay.orders.create({
            amount,
            currency
        })
        if (!rzpOrder) throw { message: "Unable to generate payment. Try again" }

        const paymentData = await Payment.create({ createdAt: currentDate, updatedAt: currentDate, userId: req.user._id, planId, amount: amount / 100, orderId: rzpOrder.id, paymentData: rzpOrder, paymentType: "razorpay", paymentStatus: 0 });
        if (!paymentData) throw { message: "Unable to create payment. Try again" }
        res.status(200).send({ status: 1, message: "Payment created successfully!", data: paymentData })
    }
    catch (e) {
        next(e)
    }
};

//RazorPay_Payment_Confirmation
exports.storeRzpPayment = async (req, res, next) => {
    try {

        let {
            orderId,
            rzpSignature,
            transactionStatus,
            paymentId,
            invoiceNumber,
            courseIds
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            orderId,
            rzpSignature,
            transactionStatus,
            paymentId,
            courseIds
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        courseIds = [...new Set(courseIds)];
        if (req.user.status != 2 && req.user.status != 1) throw { status: 403, message: "Your account is already having an active plan." }
        if (!courseIds.length) throw { status: 400, message: "Please provide atleast once courseId." }

        let currentDate = getCurrentDateAndTime();
        if (transactionStatus !== 1 && transactionStatus !== 2 && transactionStatus !== 3) throw { status: 400, message: "Please provide a valid transaction status." }
        let userId = req.user._id;

        //Validating Given order and UserId is valid or not
        const checkPayment = await Payment.findOne({ orderId, userId }).populate([{ path: 'planId', select: 'price name validityInDays directReferralPoints maxCourse referralProgram' }]);
        if (!checkPayment) throw { status: 404, message: "Please provide a valid orderId." }
        if (checkPayment && checkPayment.paymentStatus != 0) throw { status: 400, message: "This payment is already completed." }

        // Fetching data from razorpay integrations
        const rzpData = await razorpay.orders.fetch(orderId);

        //Preparing Updating Body
        let paymentUpdateBody = {
            paymentStatus: transactionStatus,
            rzpSignature,
            paymentId,
            paymentData: rzpData,
            updatedAt: currentDate
        };

        if (transactionStatus == 1) {

            if (checkPayment.invoiceNumber) invoiceNumber = checkPayment.invoiceNumber;
            else if (!checkPayment.invoiceNumber) {
                //Calculating Current Invoice Number
                let invoiceCode = 'LM';
                invoiceNumber = `${invoiceCode}${Math.floor(Date.now() / 1000)}`;
            }
            if (!invoiceNumber) throw { message: "InvoiceNumber not generated.Try again" }
            //Updating Invoice numbers for payments
            paymentUpdateBody.invoiceNumber = invoiceNumber;

            //Subscription Duration generation
            const { validityInDays, directReferralPoints, maxCourse } = checkPayment.planId;
            let planStartsAt = moment(currentDate).format("YYYY-MM-DD");
            planStartsAt = `${planStartsAt}T00:00:00.000Z`;
            let planExpiresAt = moment(addDaysToDate(parseInt(validityInDays))).format('YYYY-MM-DD')
            planExpiresAt = `${planExpiresAt}T23:59:00.000Z`;

            paymentUpdateBody.planStartsAt = planStartsAt, paymentUpdateBody.planExpiresAt = planExpiresAt;
            let userUpdateBody = { updatedAt: getCurrentDateAndTime(), paymentId: checkPayment._id };
            // if (checkPayment.planId.maxCourse) userUpdateBody.maxCourse = checkPayment.planId.maxCourse, userUpdateBody.status = 3;
            if (checkPayment.planId.maxCourse) userUpdateBody.maxCourse = checkPayment.planId.maxCourse;
            if (checkPayment.planId.referralProgram) userUpdateBody.referralProgram = checkPayment.planId.referralProgram, userUpdateBody.status = 4, paymentUpdateBody.directReferralPoints = directReferralPoints;
            // if (checkPayment.planId.maxCourse && !checkPayment.planId.referralProgram) userUpdateBody.planExpiresAt = planExpiresAt;
            await User.findOneAndUpdate({ _id: userId }, { $set: userUpdateBody }, { new: true })
            await UserCourse.updateMany({ userId }, { $set: { isDeleted: true, updatedAt: currentDate } }, { multi: true });
            for (let x of courseIds) {
                let courseData = await Course.findOne({ _id: x });
                if (courseData) {
                    await UserCourse.findOneAndUpdate({ courseId: x, categoryId: courseData.categoryId, userId }, {
                        courseId: x, categoryId: courseData.categoryId, userId,
                        isDeleted: false,
                        createdAt: currentDate,
                        updatedAt: currentDate
                    }, { new: true, upsert: true, setDefaultsOnInsert: true })
                }
            }

        }

        const paymentData = await Payment.findOneAndUpdate({ orderId, userId }, { $set: paymentUpdateBody }, { new: true });
        if (!paymentData) throw { status: 500, message: "Unable to update payment.Try again" }

        res.status(200).send({ status: 1, message: "Payment updated successfully!", data: paymentData })
    }
    catch (e) {
        next(e)
    }
}


//RazorPay_Payment_Confirmation
exports.storeRzpPaymentTest = async (req, res, next) => {
    try {

        let {
            orderId,
            rzpSignature,
            transactionStatus,
            paymentId,
            invoiceNumber
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            orderId,
            rzpSignature,
            transactionStatus,
            paymentId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        let currentDate = getCurrentDateAndTime();
        if (transactionStatus !== 1 && transactionStatus !== 2 && transactionStatus !== 3) throw { status: 400, message: "Please provide a valid transaction status." }
        let userId = req.user._id;

        //Validating Given order and UserId is valid or not
        const checkPayment = await Payment.findOne({ orderId, userId }).populate([{ path: 'planId', select: 'price name validityInDays directReferralPoints maxCourse referralProgram' }]);
        if (!checkPayment) throw { status: 400, message: "Please provide a valid orderId." }
        if (!checkPayment && checkPayment.status == 1) throw { status: 400, message: "This payment is already completed." }

        if (checkPayment.invoiceNumber) invoiceNumber = checkPayment.invoiceNumber;
        else if (!checkPayment.invoiceNumber) {
            //Invoice Number generation
            let invoiceCode = 'LM';
            invoiceNumber = `${invoiceCode}${Math.floor(Date.now() / 1000)}`;
        }
        if (!invoiceNumber) throw { message: "InvoiceNumber not generated.Try again" }
        // Fetching data from razorpay integrations
        const rzpData = await razorpay.orders.fetch(orderId);

        //Preparing Updating Body
        let paymentUpdateBody = {
            invoiceNumber,
            paymentStatus: transactionStatus,
            rzpSignature,
            paymentId,
            paymentData: rzpData,
            updatedat: currentDate
        };
        //Subscription Duration generation
        const { validityInDays, directReferralPoints } = checkPayment.planId;
        let planStartsAt = moment(currentDate).format("YYYY-MM-DD");
        planStartsAt = `${planStartsAt}T00:00:00.000Z`;
        let planExpiresAt = moment(addDaysToDate(parseInt(validityInDays))).format('YYYY-MM-DD')
        planExpiresAt = `${planExpiresAt}T23:59:59.999Z`;

        let endorsedUpdateBody = { userId: req.user._id };
        let userUpdateBody = {};
        let isUserUpdatable = false;
        //If the payment success
        if (transactionStatus == 1) {
            paymentUpdateBody.planStartsAt = planStartsAt, paymentUpdateBody.planExpiresAt = planExpiresAt;
            userUpdateBody = { planExpiresAt, updatedAt: currentDate };
            if (checkPayment.planId.maxCourse) userUpdateBody.maxCourse = checkPayment.planId.maxCourse, userUpdateBody.status = 3, isUserUpdatable = true;
            if (checkPayment.planId.referralProgram) userUpdateBody.referralProgram = checkPayment.planId.referralProgram, userUpdateBody.status = 4, isUserUpdatable = true;
            if (checkPayment.planId.referralProgram && !req.user.endorsedId && req.user.status != 4) {

                let treeGeneration = false;
                let sponsorData = await User.findOne({ _id: req.user.sponsorId, status: { $nin: [0] } });
                if (sponsorData && sponsorData.status == 1 && checkPayment.planId.referralProgram) {
                    const pendingEndorsedUserBody = { expiresAt: sponsorData.planExpiresAt, userId, sponsorId: req.user.sponsorId, sponsorCode: req.user.sponsorCode, createdAt: getCurrentDateAndTime(), updatedAt: getCurrentDateAndTime() }
                    let pendingEndorsedData = await PendingEndorsedUsers.findOneAndUpdate({ userId, sponsorId: req.user.sponsorId, sponsorCode: req.user.sponsorCode }, {
                        $set: pendingEndorsedUserBody
                    }, { new: true, upsert: true })
                    if (!pendingEndorsedData) throw { message: "Unable to complete payment.Try again!" }
                }
                else if (sponsorData && sponsorData.status == 4) {
                    endorsedUpdateBody.isDirectReferral = true
                    isUserUpdatable = true;
                    treeGeneration = true;
                }
                else if (sponsorData && sponsorData.status != 1) {
                    endorsedUpdateBody.isDirectReferral = false
                    const baseLevelUser = await BasicLevel.findOne({});
                    sponsorData = await User.findOne({ level: baseLevelUser.level, slotNumber: baseLevelUser.slot })
                    isUserUpdatable = true;
                    treeGeneration = true;
                }
                // else if (sponsorData && sponsorData.status == 1 && checkPayment.planId.referralProgram) {
                //     throw { status: 403, message: "Your sponsor is currently not paid and enjoying trial period. So payment is not allowed for your account!" }
                // }

                if (treeGeneration) {
                    console.log("Endorsed Tree Generation started")
                    let functionBody = { userId: req.user._id, referralCode: req.user.referralCode };
                    if (req.user.sponsorCode && req.user.isDirectReferral) functionBody.sponsorCode = req.user.sponsorCode;

                    //Getting Paid Endorsed UserId
                    let endorsedParentId = await allotEndorsedParent({ userId: req.user._id });
                    if (endorsedParentId) functionBody.parentId = endorsedParentId;
                    else throw { status: 404, message: "Endorsed user not found. Try again!" }

                    //Generating Level and Slots for endorsed users and updating in endorsed users documents
                    let slotsData = await generateEndorsedLevelAndSlots(functionBody);
                    endorsedUpdateBody = { ...slotsData, ...endorsedUpdateBody, sponsorId: sponsorData.endorsedId, sponsorCode: sponsorData.referralCode, planStartsAt, planExpiresAt, createdAt: getCurrentDateAndTime(), updatedAt: getCurrentDateAndTime() }
                    let endorsedUserData = await EndorsedUsers.create(endorsedUpdateBody);
                    if (!endorsedUserData) throw { status: 500, message: "Unable to create endorsed account. Try again" }
                    userUpdateBody.endorsedId = endorsedUserData._id;

                    //Updating endorsed details in their alloted parent documents
                    let parentUpdateBody = {};
                    if (endorsedUserData.slotPosition == "left") parentUpdateBody.leftChild = endorsedUserData._id;
                    else if (endorsedUserData.slotPosition == "middle") parentUpdateBody.middleChild = endorsedUserData._id;
                    else if (endorsedUserData.slotPosition == "right") parentUpdateBody.rightChild = endorsedUserData._id;
                    if (endorsedUserData.slotPosition && endorsedUserData.parentId) await EndorsedUsers.findOneAndUpdate({ _id: endorsedUserData.parentId }, { $set: parentUpdateBody }, { new: true })

                    //Fetching the above parents for the user till depth 12 in DESC
                    let parentsWalletPointsData = await fetchEndorsedParentsData({ endorsedUserId: endorsedUserData._id, pointsType: 1, userId });

                    //Calculating Direct Referral sponsor credits
                    if (endorsedUserData) {
                        const sponsorPointsData = { userId: sponsorData._id, joinerId: userId, points: directReferralPoints, transactionType: 'credit', depositType: 'directreferralpoints', pointsType: 1 }
                        parentsWalletPointsData = [...parentsWalletPointsData, sponsorPointsData];
                    }

                    //Creating all parent related wallet Points
                    if (parentsWalletPointsData.length) {
                        await WalletHistory.insertMany(parentsWalletPointsData);
                    }
                }
            }
            if (isUserUpdatable) await User.findOneAndUpdate({ _id: userId }, { $set: userUpdateBody }, { new: true })
        }
        const paymentData = await Payment.findOneAndUpdate({ orderId, userId }, { $set: paymentUpdateBody }, { new: true });
        res.status(200).send({ status: 1, message: "Payment updated successfully!", data: paymentData })
    }
    catch (e) {
        next(e)
    }
}

exports.fetchUserPayments = async (req, res, next) => {
    try {

        let {
            id,
            userId,
            startDate,
            endDate,
            limit, page, skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 100;
        page = page ? parseInt(page) : 0;
        skip = parseInt(limit) * parseInt(page);

        let dbQuery = { status: "paid" }
        if (id) dbQuery._id = id;
        if (userId) dbQuery.userId = userId;
        if (startDate && endDate) dbQuery.created_at = {
            $gte: `${startDate}T00:00:00.000Z`,
            $lte: `${endDate}T23:59:59.000Z`
        }

        let data = await Payment.find(dbQuery).populate([
            { path: 'userId', select: 'name email referralCode mobileNo planStartsAt planExpiresAt' }
        ]).sort({ 'created_at': -1 }).limit(limit).skip(skip);
        let totalData = await Payment.find(dbQuery).populate([
            { path: 'userId', select: 'name email referralCode mobileNo planStartsAt planExpiresAt' }
        ]).countDocuments();

        res.status(200).send(responseJson(1, { totalCount: totalData, paymentData: data }, 'Payment Fetching success', {}, data.length))
    }
    catch (e) {
        next(e)
    }
}


exports.upgradePlan = async (req, res, next) => {
    try {
        const planId = req.body.planId;
        let currentDate = getCurrentDateAndTime();
        if (!planId) throw { status: 400, message: "Please provide plan." }
        if (req.user.status != 4 || req.user.maxCourse > 1) throw { status: 403, message: "You're not eligible to upgrade this plan!" }

        const planData = await Plans.findOne({ isDeleted: false, _id: planId, upgradePlan: true });
        if (!planData) throw { status: 404, message: "No plan found." }
        if (planData && planData.status == 0) throw { status: 404, message: "The requested plan is currently inactive." }
        if (planData && !planData.referralProgram) throw { status: 400, message: "This upgrade plan is under maintenance." }

        let amount = parseInt(planData.price - 499) * 100;
        let currency = "INR"

        let rzpOrder = await razorpay.orders.create({
            amount,
            currency
        })
        if (!rzpOrder) throw { message: "Unable to generate payment. Try again" }

        const paymentData = await Payment.create({ purchaseType: 2, createdAt: currentDate, updatedAt: currentDate, userId: req.user._id, planId, amount: amount / 100, orderId: rzpOrder.id, paymentData: rzpOrder, paymentType: "razorpay", paymentStatus: 0 });
        if (!paymentData) throw { message: "Unable to create payment. Try again" }
        res.status(200).send({ status: 1, message: "Payment created successfully!", data: paymentData })
    }
    catch (error) {
        next(error)
    }
}

//RazorPay_Payment_Confirmation
exports.storeUpgradePlanRzpPayment = async (req, res, next) => {
    try {

        let {
            orderId,
            rzpSignature,
            transactionStatus,
            paymentId,
            invoiceNumber,
            courseIds
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            orderId,
            rzpSignature,
            transactionStatus,
            paymentId,
            courseIds
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        courseIds = [...new Set(courseIds)];
        if (req.user.status != 4 || req.user.maxCourse > 1) throw { status: 403, message: "You're not eligible to upgrade this plan!" }
        if (!courseIds.length) throw { status: 400, message: "Please provide atleast once courseId." }

        let currentDate = getCurrentDateAndTime();
        if (transactionStatus !== 1 && transactionStatus !== 2 && transactionStatus !== 3) throw { status: 400, message: "Please provide a valid transaction status." }
        let userId = req.user._id;

        //Validating Given order and UserId is valid or not
        const checkPayment = await Payment.findOne({ orderId, userId }).populate([{ path: 'planId', select: 'price name validityInDays directReferralPoints maxCourse referralProgram' }]);
        if (!checkPayment) throw { status: 404, message: "No payment found!" }
        if (checkPayment && checkPayment.paymentStatus != 0) throw { status: 400, message: "This payment is already completed." }

        // Fetching data from razorpay integrations
        const rzpData = await razorpay.orders.fetch(orderId);

        //Preparing Updating Body
        let paymentUpdateBody = {
            paymentStatus: transactionStatus,
            rzpSignature,
            paymentId,
            paymentData: rzpData,
            updatedAt: currentDate
        };

        //Upgrading the user if the transaction is success
        if (transactionStatus == 1) {

            if (checkPayment.invoiceNumber) invoiceNumber = checkPayment.invoiceNumber;
            else if (!checkPayment.invoiceNumber) {
                //Invoice Number generation
                let invoiceCode = 'LM';
                invoiceNumber = `${invoiceCode}${Math.floor(Date.now() / 1000)}`;
            }
            if (!invoiceNumber) throw { message: "InvoiceNumber not generated.Try again" }

            //Updating Invoice numbers for payments
            paymentUpdateBody.invoiceNumber = invoiceNumber;

            //Subscription Duration generation
            const { validityInDays, directReferralPoints, maxCourse } = checkPayment.planId;
            let planStartsAt = moment(currentDate).format("YYYY-MM-DD");
            planStartsAt = `${planStartsAt}T00:00:00.000Z`;
            let planExpiresAt = moment(addDaysToDate(parseInt(validityInDays))).format('YYYY-MM-DD')
            planExpiresAt = `${planExpiresAt}T23:59:00.000Z`;
            paymentUpdateBody.planStartsAt = planStartsAt, paymentUpdateBody.planExpiresAt = planExpiresAt;
            let userUpdateBody = { updatedAt: getCurrentDateAndTime(), paymentId: checkPayment._id, planExpiresAt };
            if (checkPayment.planId.referralProgram) userUpdateBody.maxCourse = maxCourse; userUpdateBody.referralProgram = 1, userUpdateBody.status = 4, paymentUpdateBody.directReferralPoints = directReferralPoints;
            await User.findOneAndUpdate({ _id: userId }, { $set: userUpdateBody }, { new: true })
            //Subscribing for courses
            for (let x of courseIds) {
                let courseData = await Course.findOne({ _id: x });
                if (courseData) {
                    await UserCourse.findOneAndUpdate({ courseId: x, categoryId: courseData.categoryId, userId }, {
                        courseId: x, categoryId: courseData.categoryId, userId,
                        isDeleted: false,
                        createdAt: currentDate,
                        updatedAt: currentDate
                    }, { new: true, upsert: true, setDefaultsOnInsert: true })
                }
            }
        }
        const paymentData = await Payment.findOneAndUpdate({ orderId, userId }, { $set: paymentUpdateBody }, { new: true });
        if (!paymentData) throw { status: 500, message: "Unable to update payment.Try again" }
        res.status(200).send({ status: 1, message: "Payment updated successfully!", data: paymentData })
    }
    catch (error) {
        next(error)
    }
}


exports.storeApplePayment = async (req, res, next) => {
    try {
        let {
            paymentStatus,
            planId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            paymentStatus,
            planId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);

        if (paymentStatus !== "success" && paymentStatus !== "failed") throw { status: 400, message: "Please provide a valid status" }

        const userData = req.user;
        const userId = req.user._id;
        const currentDate = getCurrentDateAndTime();
        if (userData.status == 4) throw { status: 403, message: "This user is already having an active plan." }

        const planData = await Plans.findOne({ isDeleted: false, _id: planId });
        if (!planData) throw { status: 404, message: "No plan found." }
        if (planData && planData.status == 0) throw { status: 404, message: "The requested plan is currently inactive." }

        let paymentUpdateBody = {
            paymentType: "apple",
            purchaseType: 1,
            updatedAt: currentDate,
            createdAt: currentDate,
            userId,
            planId,
            amount: planData.price,
            isSelfPurchased: true,
            currency: "INR"
        };
        let userUpdateBody = { updatedAt: currentDate };
        if (paymentStatus == "failed") {
            paymentUpdateBody.paymentStatus = 0;
        }
        else if (paymentStatus == "success") {

            //Alloting plan to users;
            const invoiceCode = 'LM';
            const invoiceNumber = `${invoiceCode}${Math.floor(Date.now() / 1000)}`;
            let planStartsAt = moment(currentDate).format("YYYY-MM-DD");
            planStartsAt = `${planStartsAt}T00:00:00.000Z`;
            let planExpiresAt = moment(addDaysToDate(parseInt(planData.validityInDays))).format('YYYY-MM-DD')
            planExpiresAt = `${planExpiresAt}T23:59:00.000Z`;

            paymentUpdateBody.paymentStatus = 1;
            paymentUpdateBody.invoiceNumber = invoiceNumber;
            paymentUpdateBody.planStartsAt = planStartsAt;
            paymentUpdateBody.planExpiresAt = planExpiresAt;

            if (planData.maxCourse) userUpdateBody.maxCourse = planData.maxCourse;
            if (planData.referralProgram) userUpdateBody.referralProgram = planData.referralProgram, userUpdateBody.status = 4, paymentUpdateBody.directReferralPoints = planData.directReferralPoints;

        }
        // console.log({ userUpdateBody, paymentUpdateBody })
        const paymentData = await Payment.create(paymentUpdateBody);
        if (!paymentData) throw { status: 422, message: "Payment updation failed. Try again" }

        if (paymentData && paymentStatus == "success") await User.findOneAndUpdate({ _id: userId }, { $set: { ...userUpdateBody, paymentId: paymentData._id } }, { new: true })
        res.status(201).send({ status: 1, message: "Payment details stored successfully!", data: {} })

    }
    catch (error) {
        next(error)
    }
}


exports.storeUpgradePlanApplePayment = async (req, res, next) => {
    try {

        let {
            transactionStatus,
            courseIds,
            planId
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            transactionStatus,
            courseIds,
            planId
        }

        let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
        if (requestDataValid !== true) throw Error(requestDataValid);
        const currentDate = getCurrentDateAndTime();
        const userId = req.user._id;

        courseIds = [...new Set(courseIds)];

        if (req.user.status != 4 || req.user.maxCourse > 1) throw { status: 403, message: "You're not eligible to upgrade this plan!" }
        if (!courseIds.length) throw { status: 400, message: "Please provide atleast once courseId." }

        const planData = await Plans.findOne({ isDeleted: false, _id: planId, upgradePlan: true });
        if (!planData) throw { status: 404, message: "No plan found." }
        if (planData && planData.status == 0) throw { status: 404, message: "The requested plan is currently inactive." }
        if (planData && !planData.referralProgram) throw { status: 400, message: "This upgrade plan is under maintenance." }

        const amount = parseInt(planData.price - 499) * 100;
        const currency = "INR"

        if (transactionStatus !== 1 && transactionStatus !== 2) throw { status: 400, message: "Please provide a valid transaction status." }

        //Preparing Updating Body
        let paymentUpdateBody = {
            userId,
            planId,
            paymentType: "apple",
            purchaseType: 2,
            paymentStatus: transactionStatus == 1 ? 1 : 0,
            updatedAt: currentDate,
            createdAt: currentDate,
            isSelfPurchased: true,
            amount,
            currency: "INR"
        };

        //User update Body
        let userUpdateBody = {
            updatedAt: currentDate
        }

        //Upgrading the user if the transaction is success
        if (transactionStatus == 1) {
            //Invoice Number generation
            let invoiceCode = 'LM';
            invoiceNumber = `${invoiceCode}${Math.floor(Date.now() / 1000)}`;
            //Updating Invoice numbers for payments
            paymentUpdateBody.invoiceNumber = invoiceNumber;

            //Subscription Duration generation
            const { validityInDays, directReferralPoints, maxCourse } = planData;
            let planStartsAt = moment(currentDate).format("YYYY-MM-DD");
            planStartsAt = `${planStartsAt}T00:00:00.000Z`;
            let planExpiresAt = moment(addDaysToDate(parseInt(validityInDays))).format('YYYY-MM-DD')
            planExpiresAt = `${planExpiresAt}T23:59:00.000Z`;
            paymentUpdateBody.planStartsAt = planStartsAt, paymentUpdateBody.planExpiresAt = planExpiresAt;

            userUpdateBody.planExpiresAt = planExpiresAt;

            if (planData.referralProgram) userUpdateBody.maxCourse = maxCourse; userUpdateBody.referralProgram = 1, userUpdateBody.status = 4, paymentUpdateBody.directReferralPoints = directReferralPoints;
        }
        const paymentData = await Payment.create(paymentUpdateBody);
        if (!paymentData) throw { status: 500, message: "Unable to update payment.Try again" }

        if (paymentData && paymentData.paymentStatus == 1) {
            await User.findOneAndUpdate({ _id: userId }, { $set: { ...userUpdateBody, paymentId: paymentData._id } }, { new: true })
            //Subscribing for courses
            for (let x of courseIds) {
                let courseData = await Course.findOne({ _id: x });
                if (courseData) {
                    await UserCourse.findOneAndUpdate({ courseId: x, categoryId: courseData.categoryId, userId }, {
                        courseId: x, categoryId: courseData.categoryId, userId,
                        isDeleted: false,
                        createdAt: currentDate,
                        updatedAt: currentDate
                    }, { new: true, upsert: true, setDefaultsOnInsert: true })
                }
            }
        }

        res.status(200).send({ status: 1, message: "Payment updated successfully!", data: paymentData })
    }
    catch (error) {
        next(error)
    }
}



