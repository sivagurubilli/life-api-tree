let { getCurrentDate, getCurrentDateAndTime, getNextMonday, getPreviousTuesday } = require("../helpers/dates")
let { WalletHistory } = require('../models')
const mongoose = require("mongoose");
const moment = require("moment");
let { fetchUserWalletData } = require("./treeManagement.c.js")


exports.fetchUserWallet = async (req, res, next) => {

    try {

        const userId = req.user._id;
        const status = req.user.status;
        const data = await fetchUserWalletData({ userId, status });
        if (!data) throw { status: 500, message: "Wallet fetching failed. Try again" }
        res.status(200).send({ status: 1, message: "Wallet fetched successfully!", data })

    } catch (error) {
        next(error)
    }
}

// exports.submitWithdrawlRequest = async (req, res) => {
//     try {
//         let {
//             userId,
//             bankDetailsId,
//             points
//         } = Object.assign(req.body, req.query, req.params)

//         let requiredFields = {
//             userId,
//             bankDetailsId,
//             points
//         }

//         let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
//         if (requestDataValid !== true) throw Error(requestDataValid);

//         const isAvailableDenomination = checkAvailableDenominations(points);
//         if (!isAvailableDenomination) throw Error("Plese provide points in multiples of 100")
//         if (points < 500) throw Error("Minimum withdrawl amount is 500")

//         const userData = await isValidUser(userId);

//         const checkAccountNumberUser = await BankDetails.findOne({ userId, isDeleted: false, _id: bankDetailsId })
//         if (!checkAccountNumberUser) throw Error("Bank details not matching with user")

//         const checkDirectReferrals = await User.find({ sponsorCode: userData.referralCode, userType: "paid" });
//         if (!checkDirectReferrals.length || checkDirectReferrals.length < 3) throw Error("You need three direct referrals to withdraw amount")

//         let userWalletBalance = await fetchUserWalletHistory({ userId });
//         userWalletBalance = userWalletBalance.totalAvailablePoints;
//         if (userWalletBalance < points) throw Error("Your entered amount is greater than available balance")

//         const withdrawlPayoutDate = getWithdrawlPayoutDate(getCurrentDateAndTime());
//         if (!withdrawlPayoutDate) throw Error("Unable to generate payout date.Try again")

//         const data = await WalletHistory.create({
//             userId,
//             withdrawlBankDetailsId: bankDetailsId,
//             points,
//             transactionType: 'debit',
//             withdrawlStatus: 'requestRaised',
//             withdrawlType: 'banktransfer',
//             withdrawlPayoutDate
//         })

//         if (!data) throw Error("Unable to raise withdraw request.Try again")
//         res.status(200).send(responseJson(1, data, 'Withdrawls History Request creation success'))
//     }
//     catch (e) {
//         res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Withdrawls History Request creation failed', e))

//     }
// }

// exports.fetchWithdrawlsHistory = async (req, res) => {
//     try {
//         let {
//             userId,
//             status,
//             id,
//             limit, page, skip
//         } = Object.assign(req.body, req.query, req.params)

//         let requiredFields = {

//         }

//         let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
//         if (requestDataValid !== true) throw Error(requestDataValid);

//         limit = limit ? parseInt(limit) : 50;
//         page = page ? parseInt(page) : 0;
//         skip = parseInt(limit) * parseInt(page);

//         let dbQuery = { transactionType: 'debit' };
//         if (id) dbQuery._id = id;
//         if (userId) dbQuery.userId = userId;
//         if (status) dbQuery.withdrawlStatus = status;
//         const data = await WalletHistory.find(dbQuery).populate([{ path: 'withdrawlBankDetailsId' }]).sort({ '_id': -1 }).limit(limit).skip(skip);
//         res.status(200).send(responseJson(1, data, 'Withdrawls History Fetching success', {}, data.length))

//     }
//     catch (e) {
//         res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Withdrawls History Fetching Failed', e))
//     }
// }

// exports.fetchWithdrawlRequests = async (req, res) => {
//     try {
//         let {
//             userId,
//             status,
//             id,
//             limit, page, skip,
//             startDate,
//             endDate
//         } = Object.assign(req.body, req.query, req.params)

//         let requiredFields = {

//         }

//         let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
//         if (requestDataValid !== true) throw Error(requestDataValid);


//         limit = limit ? parseInt(limit) : 50;
//         page = page ? parseInt(page) : 0;
//         skip = parseInt(limit) * parseInt(page);

//         if (!startDate) startDate = getPreviousTuesday(new Date(getCurrentDate()));
//         if (!endDate) endDate = getNextMonday(new Date(getCurrentDate()));

//         let dbQuery = {
//             transactionType: 'debit',
//             withdrawlStatus: (status) ? status : 'requestRaised',
//             withdrawlPayoutDate: {
//                 $gte: `${startDate}T00:00:00.000Z`,
//                 $lte: `${endDate}T23:59:59.000Z`
//             }
//         };
//         if (id) dbQuery._id = id;
//         if (userId) dbQuery.userId = userId;

//         const data = await WalletHistory.find(dbQuery).populate([
//             {
//                 path: 'userId', select: 'name mobileNo referralCode profileImageUrl'
//             },
//             {
//                 path: 'withdrawlBankDetailsId', select: '-createdAt -updatedAt'
//             }
//         ]).sort({ withdrawlPayoutDate: 1 }).limit(limit).skip(skip);
//         res.status(200).send(responseJson(1, data, 'Withdrawls History Fetching success', {}, data.length))

//     }
//     catch (e) {
//         res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Withdrawls History Fetching Failed', e))
//     }
// }

// exports.updateWithdrawlRequest = async (req, res) => {
//     try {
//         let {
//             isApproved,
//             id,
//             status
//         } = Object.assign(req.body, req.query, req.params)

//         let requiredFields = {
//             id
//         }

//         let requestDataValid = isRequestDataValid(requiredFields, req.reqId)
//         if (requestDataValid !== true) throw Error(requestDataValid);

//         let withdrawlData = await WalletHistory.findOne({ _id: id });
//         if (!withdrawlData) throw Error("Invalid withdrawl request id");
//         if (withdrawlData && withdrawlData.status == "completed") throw Error("Request is already approved earlier")
//         if (withdrawlData && withdrawlData.status == "rejected") throw Error("Request is already rejected earlier")

//         if (!isApproved) status = "rejected";
//         if (isApproved) status = "completed";

//         withdrawlData = await WalletHistory.findOneAndUpdate({ _id: id }, { $set: { withdrawlStatus: status, withdrawlRequestActionOn: Date.now() } }, { new: true });
//         res.status(200).send(responseJson(1, withdrawlData, 'Withdrawls Request Update Success', {}))

//     }
//     catch (e) {
//         res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Withdrawls Request Update Failed', e))
//     }
// }


