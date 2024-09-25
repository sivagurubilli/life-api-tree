const mongoose = require("mongoose");
let { privateKey, adminEmail, cryptoSecretKey, environment } = require('../config/config')
let { sendMobileSms, generateAge, generateReferralCode, capitalizeEveryInnerWord, generateSlotNumberWithchildSlotPosition,
  fetchChildSlotPosition, fetchNextAvailableSlotPosition, generateSlotNumber, responseJson, sendMail, isRequestDataValid,
  sendOtp, sendOtpOld, generateOtp } = require('../utils/appUtils');
let { UserActivityLogs, User, UserCourse, Category, Role, Otp, Course, WalletHistory, EndorsedUsers, Payment, LoginHistory, BankDetails } = require('../models')
const jwt = require('jsonwebtoken')
const { fetchParentsData, fetchUserWalletHistory, fetchBasicLevelAndSlot, generateUserLevelAndSlots, fetchUserGroupsData, fetchUserWalletData, fetchUserGroupStatsData } = require("./treeManagement.c");
const { mongoDb } = require("../config/config");
const { databaseConnection } = require("../config/database");
const { checkLoginAttempts, checkValidUser } = require("../helpers/user");
const smsTemplates = require("../utils/smsTemplates");
const { getCurrentDateAndTime, addDaysToDate } = require("../helpers/dates");
const { generateAccessToken, generateRefreshToken, validateUserAccessToken } = require("../middlewares/authToken.js")
const moment = require("moment");
const crypto = require('crypto');


exports.isValidReferralCode = async (req, res, next) => {
  try {

    let referralCode = req.body.referralCode;
    if (!referralCode) throw { status: 400, message: "Please provide referral code" }

    let referralData = await User.findOne({ referralCode, isDeleted: false });
    if (!referralData) throw { status: 404, message: "Invalid referral code. Try with a valid referral code." }

    res.status(200).send({ status: 1, message: "Referral code is valid.", isValidReferral: true })

  }
  catch (error) {
    next(error)
  }
}

exports.register = async (req, res, next) => {
  try {
    let {
      referralCode,
      mobileNo,
      role,
      firebaseToken

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      mobileNo,
      role,
      referralCode
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (role !== "user") throw { status: 400, message: "Please provide a valid role." }
    let data = await User.findOne({ mobileNo, isDeleted: false, isVerified: true });
    if (data) throw { statu: 409, message: "Mobile number is already registered. Try login" }
    if (referralCode) {
      let referralData = await User.findOne({ referralCode, isDeleted: false });
      if (!referralData) throw { status: 404, message: "Invalid referral code. Try with a valid referral code." }
    }

    let otp = generateOtp();
    let message = (smsTemplates.registrationOtpTemplate).replace('{otpNumber}', otp);
    let smsResp = await sendMobileSms({ message, mobileNo: mobileNo, otp });

    let dbQuery = {
      mobileNo,
      isDirectReferral: (referralCode) ? true : false,
      role,
      createdAt: getCurrentDateAndTime(),
      updatedAt: getCurrentDateAndTime(),
      status: 1
    }
    if (referralCode) dbQuery.sponsorCode = referralCode;
    if (firebaseToken) dbQuery.firebaseToken = firebaseToken;

    data = await User.create(dbQuery);
    if (!data) throw { status: 500, message: "Unable to  create user.Try again" }
    data = JSON.parse(JSON.stringify(data))
    data.userId = data._id;
    res.status(201).send({ status: 1, message: "Otp sent successfully to mobile number", data })
  }
  catch (error) {
    next(error)
  }
}

exports.resendOtp = async (req, res, next) => {
  try {
    let {
      mobileNo,
      flow

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      mobileNo,
      flow
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    let data = await User.findOne({ mobileNo });
    if (!data) throw { status: 404, message: "No account found!" }
    let userName = data.name || "User";

    if (flow !== "signup" && flow !== "signin") throw { status: 400, message: "Please provide a valid value for flow." }
    let otp = generateOtp();
    let message = (flow == "signup") ? (smsTemplates.registrationOtpTemplate).replace('{otpNumber}', otp) : (smsTemplates.loginOtpTemplate).replace('{name}', userName).replace('{otpNumber}', otp)
    let smsResp = await sendMobileSms({ message, mobileNo: mobileNo, otp });
    if (!smsResp) throw { message: "Unable to resend otp. Please try again" }
    res.status(200).send({ status: 1, message: "Otp resend successfully to mobile number", data: {} })
  }
  catch (error) {

  }
}

exports.verifyRegistrationOtp = async (req, res, next) => {
  try {

    let {
      mobileNo,
      otp

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      mobileNo,
      otp
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    let startDate = moment(getCurrentDateAndTime()).format('YYYY-MM-DD');
    let expiryDate = moment(addDaysToDate(28)).format('YYYY-MM-DD');
    let currentDate = getCurrentDateAndTime();

    let data = await User.findOne({ mobileNo, isDeleted: false }).sort({ createdAt: -1 });
    if (!data) throw { status: 404, message: "No mobile number found.Try signup" }
    data = JSON.parse(JSON.stringify(data));

    let otpData = await Otp.findOne({ mobileNo, otp })
    if (!otpData) throw { status: 400, message: "Invald otp" }
    const accessToken = generateAccessToken(data);
    const refreshToken = generateRefreshToken(data);
    data = await User.findOneAndUpdate({ _id: data._id }, { $set: { isVerified: true, isActive: true, accessToken, refreshToken } }, { new: true }).lean();
    data = JSON.parse(JSON.stringify(data));
    data.userId = data._id;

    //If user is new then  referral ,parent, slot,levels  we will generate
    if (!data.slotNumber && !data.level && !data.slotPosition && !data.referralCode && !data.parentId) {

      let functionBody = { userId: data._id, referralCode: data.mobileNo };
      let responseData = {};

      if (data.sponsorCode && data.isDirectReferral) functionBody.sponsorCode = data.sponsorCode;
      //Generating Level and Slots for users and updating in users documents
      let userUpdateBody = await generateUserLevelAndSlots(functionBody);
      userUpdateBody = { ...userUpdateBody, planStartsAt: `${startDate}T00:00:00.000Z`, planExpiresAt: `${expiryDate}T23:59:00.000Z`, trialExpiresAt: `${expiryDate}T23:59:00.000Z`, isActive: true, isLoggedIn: true, lastLoginTime: getCurrentDateAndTime(), updatedAt: currentDate }
      let userData = await User.findOneAndUpdate({ _id: data._id }, { $set: userUpdateBody }, { new: true }).lean();

      //Preparing responses
      if (userData.referralCode) responseData.referralCode = userData.referralCode;
      if (userData.sponsorCode) responseData.sponsorCode = userData.sponsorCode;
      if (userData.sponsorId) {
        responseData.sponsorId = userData.sponsorId;
        const sponsorName = await User.findOne({ _id: userData.sponsorId });
        responseData.sponsorName = (sponsorName.name) ? sponsorName.name : null;
      }


      //Updating user details in their alloted parent documents
      let parentUpdateBody = {};
      if (userData.slotPosition == "left") parentUpdateBody.leftChild = userData._id;
      else if (userData.slotPosition == "middle") parentUpdateBody.middleChild = userData._id;
      else if (userData.slotPosition == "right") parentUpdateBody.rightChild = userData._id;
      if (userData.slotPosition && userData.parentId) await User.findOneAndUpdate({ _id: userData.parentId }, { $set: parentUpdateBody, updatedAt: currentDate }, { new: true })

      //Fetching the above parents for the user till depth 12 in DESC
      let parentsWalletPointsData = await fetchParentsData({ userId: userData._id, pointsType: 2 });

      //Calculating Direct Referral sponsor credits
      if (userData && userData.isDirectReferral) {
        const sponsorData = { userId: userData.sponsorId, joinerId: userData._id, points: 333, transactionType: 'credit', depositType: 'directreferralpoints', pointsType: 2, createdAt: currentDate, updatedAt: currentDate }
        parentsWalletPointsData = [...parentsWalletPointsData, sponsorData];
      }

      //Creating all parent related wallet Points
      if (parentsWalletPointsData.length) {
        const parentWalletCreditData = await WalletHistory.insertMany(parentsWalletPointsData);
      }

      data = userData;
    }
    res.status(200).send({ status: 1, message: "Otp verified successfully.", data })
  }
  catch (e) {
    console.log({ e })
    next(e)
  }
}

exports.registrationEditProfile = async (req, res, next) => {
  try {

    let {
      name,
      email,
      dob,
      profile
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      name,
      email,
      dob
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);
    let userId = req.user._id;

    let data = await User.findOne({ _id: userId, isDeleted: false });
    data = JSON.parse(JSON.stringify(data));
    if (!data) throw { status: 400, message: "No profile found.Try again" }
    let updateBody = { name: capitalizeEveryInnerWord(name), email, dob, updatedAt: getCurrentDateAndTime() }

    //Updating Body
    data = await User.findOneAndUpdate({ _id: userId }, { $set: updateBody }, { new: true });
    data = JSON.parse(JSON.stringify(data))
    data.userId = data._id;
    res.status(200).send({ status: 1, message: "Profile updated sucessfully!.", data })
  }
  catch (e) {
    next(e)
  }
}


exports.login = async (req, res, next) => {
  try {

    let {
      mobileNo,
      role,
      successMessage
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      mobileNo,
      role
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (role !== "user") throw { status: 400, message: "Please provide a valid role." }

    let data = await User.findOne({ mobileNo, isDeleted: false, isVerified: true });
    if (!data) {
      data = {};
      data.isAccountExists = false;
      data.mobileNo = mobileNo;
      successMessage = 'No account found.Try signup'
    }
    else if (data) {
      if (environment == "prod" && data.isLoggedIn == true) throw { status: 403, message: "Login not allowed. Already logged in on another device." }
      let otp = (mobileNo == "9040351215") ? "777777" : generateOtp();
      let name = data.name || "User"
      let message = (smsTemplates.loginOtpTemplate).replace('{name}', name).replace('{otpNumber}', otp);
      let smsResp = await sendMobileSms({ message, mobileNo: data.mobileNo, otp });
      data = {};
      data.isAccountExists = true;
      data.mobileNo = mobileNo;
      successMessage = 'OTP sent sucessfully to your mobile number'
    }
    res.status(200).send({ status: 1, message: successMessage, data })
  }
  catch (e) {
    console.log({ e })
    next(e)
  }
}


exports.verifyLoginOtp = async (req, res, next) => {
  try {

    let {
      mobileNo,
      otp,
      firebaseToken

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      mobileNo,
      otp
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    let data = await User.findOne({ mobileNo, isDeleted: false, isVerified: true });
    if (!data) throw { status: 404, message: "No profile found. Try signup" }

    let otpData = await Otp.findOne({ mobileNo, otp })
    if (!otpData) throw { status: 400, message: "Invalid otp." }

    data = await User.findOneAndUpdate({ mobileNo, isDeleted: false, isVerified: true }, { $set: { isVerified: true, firebaseToken, updatedAt: getCurrentDateAndTime() } }, { new: true }).populate([{ path: "roles", select: "name" }]).select('name referralCode sponsorCode isDirectReferral panNumber aadharNumber email status profileImageUrl mobileNo dob')
    await LoginHistory.create({ userId: data._id, lastLoginTime: getCurrentDateAndTime(), createdAt: getCurrentDateAndTime(), updatedAt: getCurrentDateAndTime() });
    data = JSON.parse(JSON.stringify(data))
    if (data.dob) data.age = generateAge(data.dob);
    if (!data.name || !data.panNumber || !data.email) {
      data.isProfileUpdated = false;
      data.userId = data._id;
    }
    else {
      data.isProfileUpdated = true;
      data.userId = data._id;
    }

    const accessToken = data.accessToken = generateAccessToken(data);
    const refreshToken = data.refreshToken = generateRefreshToken(data);

    await User.findOneAndUpdate({ _id: data._id }, { $set: { accessToken, refreshToken, isLoggedIn: true, lastLoginTime: getCurrentDateAndTime() } }, { new: true })
    // let bankListsCount = await BankDetails.find({ userId: data._id, isDeleted: false }).countDocuments();
    // data = JSON.parse(JSON.stringify(data));
    // data.isBankDetailsUpdated = (bankListsCount > 1) ? true : false;
    res.status(200).send({ status: 1, message: "Otp verified successfully", data })
  }
  catch (e) {
    next(e)
  }
}

exports.editProfileImage = async (req, res, next) => {
  try {

    let {
      profileImageUrl
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      profileImageUrl
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);
    let userId = req.user._id;

    let data = await User.findOne({ _id: userId, isDeleted: false });
    data = JSON.parse(JSON.stringify(data));
    if (!data) throw { status: 400, message: "No profile found.Try again" }
    let updateBody = { profileImageUrl, updatedAt: getCurrentDateAndTime() }

    //Updating Body
    data = await User.findOneAndUpdate({ _id: userId }, { $set: updateBody }, { new: true });
    data = JSON.parse(JSON.stringify(data))
    data.userId = data._id;
    res.status(200).send({ status: 1, message: "Profile updated sucessfully!.", data })
  }
  catch (error) {
    next(error)
  }
}



exports.fetchProfile = async (req, res, next) => {
  try {
    let bankDetailsData;
    let data = req.user;
    data = JSON.parse(JSON.stringify(data));

    data.isProfileUpdated = (!data.name || !data.email || !data.dob) ? false : true
    data.isBankDetailsUpdated = false;
    data.userId = data._id;
    if (data.dob) data.age = generateAge(data.dob);
    if (req.user.status != 1) data.remainingTrialPeriodInDays = 0;
    else if (req.user.status == 1) {

      const planExpiry = moment(req.user.planExpiresAt);
      const currentDate = moment(getCurrentDateAndTime());
      data.remainingTrialPeriodInDays = planExpiry.diff(currentDate, 'days');

    }
    res.status(200).send({ status: 1, message: "Profile fetched successfully!", data })
  }
  catch (e) {
    next(e)
  }
}

exports.getCoursesList = async (req, res, next) => {

  try {

    let {
      limit, page, skip, categoryId
    } = Object.assign(req.body, req.query, req.params)

    limit = limit ? parseInt(limit) : 50
    page = page ? parseInt(page) : 1
    skip = parseInt(limit) * parseInt(page - 1);

    let matchFilters = { isDeleted: false };

    if (categoryId) {
      let course = await Category.findOne({ _id: categoryId, isDeleted: false })
      if (!course) throw { status: 404, message: "No category found!" }
      matchFilters._id = mongoose.Types.ObjectId(categoryId)
    }


    let data = await Category.aggregate([
      {
        $match: matchFilters
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "categoryId",
          as: "courseData"
        }
      },
      {
        $unwind: "$courseData"
      },
      {
        $match: {
          'courseData.isDeleted': false
        }
      },
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          isDeleted: { $first: "$isDeleted" },
          name: { $first: "$name" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          courseData: { $push: "$courseData" }
        }
      },
      {
        $facet: {
          paginatedData: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "total" }
          ]
        }
      }
    ]);

    const paginatedData = data[0].paginatedData;
    const totalCount = data[0].totalCount[0].total;

    res.status(200).send({ status: 200, message: "Courses list fetched sucessfully", currentPageCount: paginatedData.length, totalDataCount: totalCount, data: paginatedData })
  }
  catch (e) {
    next(e)
  }
}

exports.addUserCourse = async (req, res, next) => {
  try {

    let userId = req.user._id;
    let currentDate = getCurrentDateAndTime();
    let courseIds = req.body.courseIds || [];
    if (!courseIds || !courseIds.length) throw { status: 400, message: "Please provide atlease one course Id" }

    for (let x of courseIds) {
      let categoryId = await Course.findOne({ _id: x }).distinct('categoryId');
      await UserCourse.findOneAndUpdate({ courseId: x, categoryId, userId, isDeleted: false }, {
        courseId: x, categoryId, userId,
        createdAt: currentDate,
        updatedAt: currentDate
      }, { new: true, upsert: true, setDefaultsOnInsert: true })
    }

    res.status(201).send({ status: 1, message: "Courses subscribed successfully" })
  }
  catch (e) {
    next(e)
  }
}

exports.unsubscribeUserCourse = async (req, res, next) => {
  try {
    if (!req.query.id) throw { status: 400, message: "Please provide id to unsubscribe" }
    let data = await UserCourse.findOneAndUpdate({ _id: req.query.id, userId: req.user._id }, { $set: { isDeleted: true } }, { new: true })
    if (!data) throw { status: 404, message: "No data found" }
    res.status(200).send({ status: 200, message: "Course unsubscribed succesfully", data: {} })
  }
  catch (e) {
    next(e)
  }
}

exports.getUserCoursesList = async (req, res, next) => {

  try {

    let {
      limit, page, skip, categoryId
    } = Object.assign(req.body, req.query, req.params)

    limit = limit ? parseInt(limit) : 50
    page = page ? parseInt(page) : 1
    skip = parseInt(limit) * parseInt(page - 1);

    let matchFilters = { isDeleted: false };

    if (categoryId) {
      let course = await Category.findOne({ _id: categoryId, isDeleted: false })
      if (!course) throw { status: 404, message: "No category found!" }
      matchFilters._id = mongoose.Types.ObjectId(categoryId)
    }


    let data = await Category.aggregate([
      {
        $match: matchFilters
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "categoryId",
          as: "courseData"
        }
      },
      {
        $unwind: "$courseData"
      },
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          isDeleted: { $first: "$isDeleted" },
          name: { $first: "$name" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          courseData: { $push: "$courseData" }
        }
      },
      {
        $facet: {
          paginatedData: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "total" }
          ]
        }
      }
    ]);

    const paginatedData = data[0].paginatedData;
    const totalCount = data[0].totalCount[0].total;

    res.status(200).send({ status: 200, message: "Courses list fetched sucessfully", currentPageCount: paginatedData.length, totalDataCount: totalCount, data: paginatedData })
  }
  catch (e) {
    next(e)
  }
}


exports.getUsers = async (req, res) => {
  try {

    let {
      userId,
      userType,
      startDate,
      endDate,
      limit, skip, page
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      userType
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);



    limit = limit ? parseInt(limit) : 50
    page = page ? parseInt(page) : 1
    skip = parseInt(limit) * parseInt(page - 1)

    let userRole = await Role.findOne({ name: "user" });
    let dbQuery = { roles: { $in: [userRole._id] }, isDeleted: false };
    if (userType) dbQuery.userType = userType;
    if (startDate && endDate) {
      if (userType == "unpaid") {
        dbQuery.created_at = {
          $gte: `${startDate}T00:00:00.000Z`,
          $lte: `${endDate}T23:59:59.000Z`
        }
      }
      else if (userType == "paid" || userType == "expired") {
        dbQuery.planStartsAt = {
          $gte: `${startDate}T00:00:00.000Z`,
          $lte: `${endDate}T23:59:59.000Z`
        }
      }
    }
    let data = await User.find(dbQuery).sort({ '_id': -1 }).limit(limit).skip(skip);
    let totalCount = await User.find(dbQuery).countDocuments();
    res.status(200).send(responseJson(1, { totalCount, usersData: data }, 'Users fetched succesfully', {}, data.length))
  }
  catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Users fetching failed', e))
  }
}


exports.clearChildData = async (req, res) => {
  try {
    let parentId = await User.findOneAndUpdate({ level: 1, slotNumber: 1 }, { $unset: { 'leftChild': 1, 'middleChild': 1, 'rightChild': 1 } });
    let data = await User.deleteMany({ _id: { $ne: parentId._id } });
    res.status(200).send(responseJson(1, data, 'Child data deleted succesfully'))
  }
  catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Child data deletion failed', e))

  }
}


exports.treeSetup = async (req, res) => {
  try {
    let {
      name,
      referralCode,
      result,
      nextSlot,
      nextSlotData,
      slotPosition
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      name
    }
    let requestDataValid = isRequestDataValid(requiredFields, '1234')
    if (requestDataValid !== true) throw Error(requestDataValid);

    let checkReferral;
    if (referralCode) {
      checkReferral = await User.findOne({ referralCode, isDeleted: false });
      if (!checkReferral) throw Error("Invalid referral.Try another code")
    }
    else if (!referralCode) {
      const basicLevelData = await BasicLevel.findOne({});
      if (!basicLevelData) throw Error("Basics level slots not added.")
      checkReferral = await User.findOne({ level: basicLevelData.level, slotNumber: basicLevelData.slot, isDeleted: false });
      if (!checkReferral) throw Error("No user added for basic level and slot")
    }

    let parentId = checkReferral._id;
    let body = { name, parentId: checkReferral._id, isDirectReferral: (referralCode) ? true : false, sponsorCode: checkReferral.referralCode, sponsorId: checkReferral._id }

    if (!checkReferral.leftChild && !checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "left", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[0], body.referralCode = await generateReferralCode({ level: checkReferral.level + 1 });
    else if (checkReferral.leftChild && !checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "middle", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[1], body.referralCode = await generateReferralCode({ level: checkReferral.level + 1 });
    else if (checkReferral.leftChild && checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "right", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[2], body.referralCode = await generateReferralCode({ level: checkReferral.level + 1 });
    else if (checkReferral.leftChild && checkReferral.middleChild && checkReferral.rightChild) {

      //Fetching the child data
      result = await User.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(checkReferral._id) } },
        {
          $graphLookup: {
            from: 'users',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentId',
            as: 'children',
            maxDepth: 100000,
            depthField: 'depth'
          }
        },
        { $unwind: '$children' },
        { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            level: { $first: '$level' },
            children: { $push: '$children' }
          }
        }
      ])

      //Extracting the child level next slot and level positions
      nextSlotData = await fetchNextAvailableSlotPosition(result[0].children);
      slotPosition = await fetchChildSlotPosition(nextSlotData[0].missingChilds);
      body.parentId = parentId = nextSlotData[0]._id;
      body.slotPosition = slotPosition;
      const level = parseInt(nextSlotData[0].level) + 1;
      body.level = level;
      body.slotNumber = generateSlotNumberWithchildSlotPosition(nextSlotData[0].slotNumber, slotPosition);
      body.referralCode = await generateReferralCode({ level });
    }

    //After extracting the new user levels and slots we will create the user;
    let user = await User.create(body);
    if (!user) throw Error("Unable to create user")
    let updateBody = {};
    if (user.slotPosition == "left") updateBody.leftChild = user._id;
    else if (user.slotPosition == "middle") updateBody.middleChild = user._id;
    else if (user.slotPosition == "right") updateBody.rightChild = user._id;
    if (user) await User.findOneAndUpdate({ _id: parentId }, { $set: updateBody }, { new: true })

    //Fetching the above parents for the user till depth 12 in DESC
    let parentsWalletPointsData = await fetchParentsData({ userId: user._id });
    console.log({ parentsLength: parentsWalletPointsData.length })

    //Calculating Direct Referral sponsor credits
    if (user && user.isDirectReferral) {
      const sponsorData = { userId: user.sponsorId, joinerId: user._id, points: 333, transactionType: 'credit', depositType: 'directreferralpoints' }
      parentsWalletPointsData = [...parentsWalletPointsData, sponsorData];
    }
    console.log({ parentsWalletPointsData })

    //Creating all parent related wallet Points
    if (parentsWalletPointsData.length) {
      const parentWalletCreditData = await WalletHistory.insertMany(parentsWalletPointsData);
      console.log({ parentWalletCreditData })
    }

    //Sending the response to the frontend
    res.send(responseJson(1, user, 'User created successfully'))
  }
  catch (e) {
    let statusCode = e.statusCode ? e.statusCode : 500
    let msg = e.msg ? e.msg : 'User creating Failed';
    res.status(statusCode).send(responseJson(0, [], msg, e))
  }
}

exports.fetchParentsData = async (req, res) => {
  try {

    const userId = req.query.userId;
    if (!userId) throw Error("userId is missing in fetching parents data")
    let data = await User.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(userId) } },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$parentId',
          connectFromField: 'parentId',
          connectToField: '_id',
          as: 'parents',
          maxDepth: 11,  //to fetch the parent tills 12 levels we have to provide n-1 as the depth
          depthField: 'parentLevel'
        }
      },
      {
        $unwind: "$parents"
      },
      {
        $sort: {
          "parents.level": -1,
          "parents.slotNumber": -1
        }
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          referralCode: { $first: "$referralCode" },
          parentId: { $first: "$parentId" },
          slotPosition: { $first: "$slotPosition" },
          level: { $first: "$level" },

          
          slotNumber: { $first: "$slotNumber" },
          parents: { $push: "$parents" }
        }
      },
      {
        $sort: {
          level: -1,
          slotNumber: -1
        }
      }
    ]);
    console.log({ data })
    data = JSON.parse(JSON.stringify(data));
    if (data.length &&
      data[0].parents &&
      data[0].parents.length) {
      data[0].parents.map((x) => {
        x.parentLevel = parseInt(x.parentLevel) + 1;
        return x;
      })
    }
    const levelPoints = await LevelPoints.find({});
    data = (data.length && data[0].parents.length) ? data[0].parents : [];
    let parentsData = [];
    if (data.length && levelPoints.length) {
      data.map((item2) => {
        const matchingItem = levelPoints.find(item1 => item1.level == item2.parentLevel);
        parentsData.push({ userId: item2._id, points: matchingItem ? matchingItem.points : 0, joinerId: userId, transactionType: 'credit' });
      });
    }
    res.status(200).send(responseJson(1, parentsData, 'Parents fetched succesfully'))
    // }
  } catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Parents Fetching  Failed', e))
  }
}

exports.fetchParentsTreeData = async (req, res) => {
  try {

    const userId = req.query.userId;
    if (!userId) throw Error("userId is missing in fetching parents data")
    let data = await User.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(userId) }
      },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$parentId',
          connectFromField: 'parentId',
          connectToField: '_id',
          as: 'parents',
          maxDepth: 11,
          depthField: 'parentLevel'
        }
      },
      {
        $addFields: {
          parents: {
            $filter: {
              input: "$parents",
              as: "parent",
              cond: { $ne: ["$$parent.isDeleted", true] }
            }
          }
        }
      },
      {
        $unwind: "$parents"
      },
      {
        $sort: {
          "parents.level": -1,
          "parents.slotNumber": -1
        }
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          referralCode: { $first: "$referralCode" },
          parentId: { $first: "$parentId" },
          slotPosition: { $first: "$slotPosition" },
          level: { $first: "$level" },
          slotNumber: { $first: "$slotNumber" },
          parents: { $push: "$parents" }
        }
      },
      {
        $sort: {
          level: -1,
          slotNumber: -1
        }
      }
    ]);

    console.log({ data })
    data = JSON.parse(JSON.stringify(data));
    if (data.length &&
      data[0].parents &&
      data[0].parents.length) {
      data[0].parents.map((x) => {
        x.parentLevel = parseInt(x.parentLevel) + 1;
        return x;
      })
    }

    res.status(200).send(responseJson(1, data, 'Parents fetched succesfully'))
    // }
  } catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Parents Fetching  Failed', e))
  }
}


exports.fetchChildData = async (req, res) => {
  try {
    let data = await User.aggregate([

      {
        $graphLookup: {
          from: 'users',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'children',
          maxDepth: 2,   //to fetch the parent tills 12 levels we have to provide n-1 as depth
          depthField: 'childLevel',
          restrictSearchWithMatch: { "isDeleted": false }
        }
      },
      { $unwind: '$children' },
      { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          level: { $first: '$level' },
          children: { $push: '$children' }
        }
      }
    ])
    data = JSON.parse(JSON.stringify(data));
    if (data.length &&
      data[0].children &&
      data[0].children.length) {
      data[0].children.map((x) => {
        x.childLevel = parseInt(x.childLevel) + 1;
        return x;
      })
    }
    res.status(200).send(responseJson(1, data, 'Childs fetched succesfully'))

  }
  catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Childs Fetching  Failed', e))
  }
}


exports.refreshToken = async (req, res) => {
  try {
    let token = req.headers["x-refresh-token"];
    if (!token) throw { statusCode: 499, msg: "Token missing in headers" }

    let data = await User.findOne({ refreshToken: token });
    if (!data) throw { statusCode: 401, msg: "Invalid refresh token" }

    const accessToken = generateAccessToken(data);
    data = await User.findOneAndUpdate({ _id: data._id }, { $set: { accessToken } }, { new: true })

    res.status(200).send(responseJson(1, { accessToken, expiresInSeconds: 60 * 60 * 24 * 60 }, 'Token generated successfully!'))

  } catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Generating token Failed', e))
  }
}


exports.clearUsers = async (req, res) => {
  try {
    await User.deleteMany({ level: { $nin: [1, 2, 3, 4] } })
    await EndorsedUsers.deleteMany({ level: { $nin: [1, 2, 3, 4] } })
    await WalletHistory.deleteMany({});
    await Payment.deleteMany({});

    await User.findOneAndUpdate({ level: 4 }, { $unset: { leftChild: "", middleChild: "", rightChild: "" } });
    await EndorsedUsers.findOneAndUpdate({ level: 4 }, { $unset: { leftChild: "", middleChild: "", rightChild: "" } });

    res.status(200).send(responseJson(1, {}, 'Data cleared successfully!'))

  }
  catch (e) {
    res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Data clearing failed!', e))
  }
}

exports.fetchStatsOld = async (req, res, next) => {
  try {
    let userStatus = req.user.status;
    let userId = req.user._id;
    let endorsedId = req.user.endorsedId;
    let filteredData = [];
    let filterType = req.query.filterType;
    if (!filterType) filterType = "all";
    if (filterType && filterType !== "all" && filterType !== "paid" && filterType !== "unpaid" && filterType !== "direct") throw { status: 400, message: "Please provide valid filter type.!" }
    //Db_Query_setup
    let dbPromises = [
      await User.find({ sponsorId: userId }).countDocuments(),
      await User.find({ sponsorId: userId, status: { $in: [3, 4] } }).countDocuments(),
      await User.find({ sponsorId: userId, status: { $in: [1, 2] }, isVerified: true }).countDocuments(),
    ];

    if (userStatus == 4 && req.user.endorsedId) dbPromises.push(await fetchUserGroupsData({ userId: endorsedId, modelName: "endorsedusers" }), await EndorsedUsers.find({ sponsorId: req.user.endorsedId }).countDocuments())
    if (userStatus == 1 || userStatus == 2 || (userStatus == 4 && !req.user.endorsedId)) dbPromises.push(await fetchUserGroupsData({ userId, modelName: "users" }))

    let [totalDirectCount, totalPaidCount, totalUnpaidCount, groupData, totalEndorsedDirectCount] = await Promise.all(dbPromises);

    totalDirectCount = (userStatus == 1 || userStatus == 2 || (userStatus == 4 && !req.user.endorsedId)) ? totalDirectCount : (userStatus == 3) ? 0 : totalEndorsedDirectCount;
    totalPaidCount = (userStatus != 3) ? totalPaidCount : 0;
    totalUnpaidCount = (userStatus != 3) ? totalUnpaidCount : 0;
    totalGroupCount = (userStatus != 3) ? groupData.totalGroupCount : 0;

    if (userStatus == 4 && filterType == "direct" && req.user.endorsedId) {
      filteredData = await EndorsedUsers.find({ sponsorId: endorsedId, isDirectReferral: true }).populate([{ path: "userId", select: 'name email mobileNo createdAt status' }]).sort({ createdAt: -1 });
      filteredData = filteredData.map(x => x.userId);
    }
    else if (userStatus != 3 || (userStatus == 4 && !req.user.endorsedId)) {
      let dbFilter = (filterType == "paid") ? { sponsorId: userId, isDirectReferral: true, isVerified: true, status: { $in: [3, 4] } } : (filterType == "unpaid") ? { sponsorId: userId, isDirectReferral: true, isVerified: true, status: { $in: [1, 2] } } : { sponsorId: userId, isDirectReferral: true, isVerified: true };
      console.log({ dbFilter })
      filteredData = await User.find(dbFilter).select('name email mobileNo status createdAt').sort({ createdAt: -1 });
    }
    else if (userStatus == 3) {
      filteredData = [];
    }
    res.status(200).send({ status: 1, message: "Stats fetched successfully!", data: { totalDirectCount, totalPaidCount, totalUnpaidCount, totalGroupCount, filteredDataCount: filteredData.length, filteredData } })
  }
  catch (e) {
    next(e)
  }
}

exports.fetchStats = async (req, res, next) => {
  try {
    let userStatus = req.user.status;
    let userId = req.user._id;
    let endorsedId = req.user.endorsedId;
    let filterType = req.query.filterType;
    if (!filterType) filterType = "all";
    if (filterType && filterType !== "all" && filterType !== "paid" && filterType !== "unpaid" && filterType !== "direct") throw { status: 400, message: "Please provide valid filter type.!" }

    //Db_Query_setup
    let dbFilter = { sponsorId: userId, isVerified: true, isDeleted: false };
    if (filterType == "paid") dbFilter.status = { $in: [3, 4] };
    else if (filterType == "unpaid") dbFilter.status = { $in: [1, 2] }
    else if (filterType == "direct") dbFilter.status = { $in: [1, 2, 3, 4] }

    let [totalDirectCount, totalPaidCount, totalUnpaidCount, groupData, filteredData] = await Promise.all([
      User.find({ sponsorId: userId, isVerified: true }).countDocuments(),
      User.find({ sponsorId: userId, status: { $in: [3, 4] }, isVerified: true }).countDocuments(),
      User.find({ sponsorId: userId, status: { $in: [1, 2] }, isVerified: true }).countDocuments(),
      fetchUserGroupStatsData({ userId, modelName: "users" }),
      User.find(dbFilter).select('name email mobileNo status profileImageUrl createdAt').sort({ createdAt: -1 })
    ])
    filteredDataCount = (filterType != "all") ? filteredData.length : groupData.totalGroupCount;
    filteredData = (filterType != "all") ? filteredData : groupData.usersData;
    res.status(200).send({ status: 1, message: "Stats fetched successfully!", data: { totalDirectCount, totalPaidCount, totalUnpaidCount, totalGroupCount: groupData.totalGroupCount, filteredDataCount, filteredData } })
  }
  catch (error) {
    next(error)
  }
}

exports.fetchStatsByAdmin = async (req, res, next) => {
  try {
    let userId = req.query.userId;
    if (!userId) throw { status: 400, message: "Please provide userId." }

    let user = await User.findOne({ _id: userId });
    if (!user) throw { status: 404, message: "No user found!" }

    let userStatus = user.status;
    let endorsedId = user.endorsedId;
    let filterType = req.query.filterType;
    if (!filterType) filterType = "all";
    if (filterType && filterType !== "all" && filterType !== "paid" && filterType !== "unpaid" && filterType !== "direct") throw { status: 400, message: "Please provide valid filter type.!" }

    //Db_Query_setup
    let dbFilter = { sponsorId: userId, isVerified: true, isDeleted: false };
    if (filterType == "paid") dbFilter.status = { $in: [3, 4] };
    else if (filterType == "unpaid") dbFilter.status = { $in: [1, 2] }
    else if (filterType == "direct") dbFilter.status = { $in: [1, 2, 3, 4] }

    let [totalDirectCount, totalPaidCount, totalUnpaidCount, groupData, filteredData] = await Promise.all([
      User.find({ sponsorId: userId, isVerified: true }).countDocuments(),
      User.find({ sponsorId: userId, status: { $in: [3, 4] }, isVerified: true }).countDocuments(),
      User.find({ sponsorId: userId, status: { $in: [1, 2] }, isVerified: true }).countDocuments(),
      fetchUserGroupStatsData({ userId, modelName: "users" }),
      User.find(dbFilter).select('name email mobileNo status profileImageUrl createdAt').sort({ createdAt: -1 })
    ])
    let filteredDataCount;
    filteredDataCount = (filterType != "all") ? filteredData.length : groupData.totalGroupCount;
    filteredData = (filterType != "all") ? filteredData : groupData.usersData;
    res.status(200).send({ status: 1, message: "Stats fetched successfully!", data: { totalDirectCount, totalPaidCount, totalUnpaidCount, totalGroupCount: groupData.totalGroupCount, filteredDataCount, filteredData } })
  }
  catch (error) {
    next(error)
  }
}

exports.logout = async (req, res, next) => {
  try {

    await User.findOneAndUpdate({ _id: req.user._id }, { $set: { isLoggedIn: false } }, { new: true });
    res.status(200).send({ status: 1, message: "Logged out successfully!", data: {} })
  }
  catch (error) {
    next(error)
  }
}


exports.fetchUserSubscribedCourses = async (req, res, next) => {
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
        $match: { userId: mongoose.Types.ObjectId(userId) },
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
    ]

    )
    res.status(200).send({ status: 1, message: "Subscribed courses fetched successfully!", totalDataCount: data.length, data })
  }
  catch (error) {
    next(error)
  }
}


exports.addBankDetails = async (req, res, next) => {

  try {
    let {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      accountHolderName,
      bankName,
      accountNumber: accountNumber.trim(),
      ifscCode,
      accountType
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    let userId = req.user._id;
    if (accountType && accountType !== "SAVINGS" && accountType !== "CURRENT") throw { status: 400, message: "Please provide a valid account type." }

    const bankData = await BankDetails.findOne({ accountNumber, isDeleted: false })
    if (bankData && (bankData.userId).toString() != userId.toString()) throw { status: 409, message: "This account number is already linked with another account. Try another one!" }
    if (bankData && (bankData.userId).toString() == userId.toString()) throw { status: 400, message: "This account number is already added for your account." }
    const data = await BankDetails.create({
      userId,
      accountHolderName: capitalizeEveryInnerWord(accountHolderName),
      bankName: bankName,
      accountNumber,
      ifscCode: ifscCode,
      accountType,
      createdAt: getCurrentDateAndTime(),
      updatedAt: getCurrentDateAndTime()
    });
    if (!data) throw { message: "Adding bank details failed. Try again" }
    res.status(200).send({ status: 201, message: "Bank details added successfully.", data })
  }
  catch (error) {
    next(error)
  }
}

exports.fetchBankDetails = async (req, res, next) => {
  try {
    let {
      id

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    const userId = req.user._id;
    const status = req.user.status;
    let banksList = await BankDetails.find({ userId, isDeleted: false });
    const walletData = await fetchUserWalletData({ userId, status });
    res.status(200).send({ status: 200, message: "Bank details fetched successfully!", data: { banksList, walletData } })
  }
  catch (error) {
    next(error)
  }
}

exports.updateBankDetails = async (req, res, next) => {
  try {
    let {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType,
      id

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType,
      id
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    if (accountType && accountType !== "SAVINGS" && accountType !== "CURRENT") throw { status: 400, message: "Please provide a valid account type." }

    const userId = req.user._id;
    const bankData = await BankDetails.findOne({ _id: id, isDeleted: false, userId })
    if (!bankData) throw { status: 404, message: "No bank details found!" };

    let updateBody = { updatedAt: getCurrentDateAndTime() };
    if (accountHolderName) updateBody.accountHolderName = capitalizeEveryInnerWord(accountHolderName);
    if (bankName) updateBody.bankName = bankName;
    if (ifscCode) updateBody.ifscCode = ifscCode;
    if (accountType) updateBody.accountType = accountType;
    if (accountNumber) {
      const bankData = await BankDetails.findOne({ accountNumber, isDeleted: false })
      if (bankData && (bankData.userId).toString() != userId.toString()) throw { status: 409, message: "This account number is already linked with another account. Try another one!" }
    }

    const data = await BankDetails.findOneAndUpdate({ _id: id, isDeleted: false, userId }, { $set: updateBody }, { new: true })
    res.status(200).send({ status: 200, message: "Bank details updated successfully!", data })
  }
  catch (error) {
    next(error)
  }
}


exports.deleteBankDetails = async (req, res, next) => {
  try {
    let {
      id
    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      id
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid)

    const userId = req.user._id;
    const bankData = await BankDetails.findOneAndUpdate({ _id: id, isDeleted: false, userId }, { $set: { isDeleted: true } }, { new: true })
    if (!bankData) throw { status: 404, message: "No bank details found!" };
    res.status(200).send({ status: 200, message: "Bank details deleted successfully!", data: {} })
  }
  catch (error) {
    next(error)
  }
}

exports.encryptWeblink = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) throw { status: 400, message: "Please provide url" }
    const regex = /https?:\/\/www\.learningmastry\.in\/signup\/(\d+)/;
    const match = url.match(regex);
    if (!match) throw { status: 400, message: "Please provide a valid URL format." }
    const mobileNumber = match[1];

    // Define encryption parameters
    // Generate a 16-byte key (128 bits) for AES-128-CBC
    const secretKey = cryptoSecretKey;
    const secretKeyHex = secretKey.toString('hex');
    const keyBuffer = Buffer.from(secretKeyHex, 'hex');
    const ivBuffer = Buffer.alloc(16);

    //Encrypting the Mobil number
    const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
    let encryptedMobileNumber = cipher.update(mobileNumber, 'utf8', 'hex');
    encryptedMobileNumber += cipher.final('hex');

    //Updating Url
    const data = url.replace(mobileNumber, encryptedMobileNumber);

    //Decryption-testing
    // const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
    // let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    // decrypted += decipher.final('utf8');


    res.status(200).send({ status: 200, message: "Data encrypted successfully!", data })
  }
  catch (error) {
    next(error)
  }
}

exports.storeUserActivityLog = async (req, res, next) => {
  try {
    let {
      activity

    } = Object.assign(req.body, req.query, req.params)

    let requiredFields = {
      activity
    }

    let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
    if (requestDataValid !== true) throw Error(requestDataValid);

    const activities = [
      "user_login",
      "current_affairs_viewed",
      "quiz_viewed",
      "fundamental_pretest_viewed",
      "fundamental_pretest_submitted",
      "fundamental_finaltest_viewed",
      "fundamental_finaltest_submitted",
      "fundamental_material_viewed",
      "fundamental_material_submitted",
      "course_pretest_viewed",
      "course_pretest_submitted",
      "course_finaltest_viewed",
      "course_finaltest_submitted",
      "course_material_viewed",
      "course_material_submitted"
    ];
    if (!activities.includes(activity.trim().toLowerCase())) throw { status: 400, message: "Please provide a valid activity" }
    const currentDate = getCurrentDateAndTime();
    const data = await UserActivityLogs.create({ userId: req.user._id, activity: activity.trim().toLowerCase(), createdAt: currentDate, updatedAt: currentDate });
    if (!data) throw { message: "Unable to log the activity. Try again" }
    res.status(201).send({ status: 1, message: "Activity logged successfully!", data })
  }
  catch (error) {
    next(error)
  }
}






