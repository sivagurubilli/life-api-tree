
let { invoiceGen, sendNotice } = require('../utils/appUtils');
const moment = require('moment');
const { getCurrentDateAndTime, getTomorrowDate, addDaysToDate } = require("../helpers/dates");
let { Subject, User, UserCourse, Category, Role, Otp, Course, WalletHistory, EndorsedUsers, Payment, Faq, CourseSubjectCombination } = require('../models')

exports.testApi = async (req, res, next) => {
    try {
        //Invoice Generation
        // let invoiceUrl = await invoiceGen({
        //     fileName: 'cookInvoice.html',
        //     invoiceNumber: 'CNCINV0001',
        //     invoiceDate: moment(getCurrentDateAndTime()).format('DD-MM-YYYY'),
        //     name: "Svss teja",
        //     email: "svssteja@gmail.com",
        //     mobile: "8332946991",
        //     address: "Visakhapatnam,Andhra pradesh-531084",
        //     planName: "Testing001",
        //     planPrice: "1999.00",
        //     planValidity: 60,
        //     totalActionsPerMonth: 15,
        //     discount: "99.00",
        //     totalPrice: "1900.00",
        // })

        // res.status(201).send({ invoiceUrl })

        // let resp = await sendNotice({
        //     title: 'Testing Notification',
        //     body: 'Notification testing by teja',
        //     data: {
        //         location: "bangalore"
        //     },
        //     userToken: ['ep5IkpgJTTKo3XZ3qM1Xfi:APA91bE1KBFo08YDmom0sDi0mALDXNyixe4YvLqMT5WYG91HazeW8lowM9LOhJsiIJ3F25aFeY7wVN7LValCXWe4RLOdC1I3_dm6Yf600cjM1Z3mvjZypCQGhOxtaND2GNlIjJRuOn0j'],
        //     userId: '656aacf041f613af753e32a6'
        // })
        // let data = await User.aggregate([
        //     {
        //         $lookup: {
        //             from: 'usercourses', // Name of the documents collection
        //             localField: '_id', // Field from the users collection
        //             foreignField: 'userId', // Field from the documents collection
        //             as: 'courses' // Name for the joined array field
        //         }
        //     },
        //     {
        //         $match: {
        //             'courses': { $exists: true, $not: { $size: 0 } } // Filter users with documents
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: '$_id',
        //             courses_count: { $sum: 1 } // Count the number of documents per user
        //         }
        //     },
        //     {
        //         $match: {
        //             courses_count: { $gt: 1 } // Filter users with more than one document
        //         }
        //     },
        //     {
        //         $project: {
        //             _id: 1 // Project only the _id field
        //         }
        //     }
        // ])
        res.status(200).send({ status: 200, success: true, data })

    }
    catch (e) {
        next(e)
    }
}