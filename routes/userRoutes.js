var express = require('express');
var multer = require('multer');
var router = express.Router();
let { course, quiz,
    auth, config, payment, test, faq, admin, series,
    file, currentAffairs, plans, fundamentals, wallet, treeManagement
} = require('../controllers');
const { validateUserAccessToken, validateSpecialAccess } = require("../middlewares/authToken");
const { validateReferralProgramAccess } = require("../middlewares/validateReferralProgramAccess");

const storage = multer.memoryStorage({
    destination: function (req, file, cb) {
        cb(null, '')
    }
});

const upload = multer({ storage: storage }).array('file', 10)

//Configurations api
router.get('/fetch/config', validateUserAccessToken, config.getconfig);
router.get('/testApi', test.testApi);

//User-Registration
router.post('/check/referralCode', auth.isValidReferralCode);
router.post('/register', auth.register);
router.post('/verify/registration/otp', auth.verifyRegistrationOtp);
router.put('/profile/edit', validateUserAccessToken, auth.registrationEditProfile);
router.get('/profile/fetch', validateUserAccessToken, auth.fetchProfile);
router.get('/clearUpData', auth.clearUsers);

//User-Profile
router.get('/profile/fetchStats', validateUserAccessToken, auth.fetchStats);
router.get('/encrypt/weblink', auth.encryptWeblink);

//Login-Api's
router.post('/login', auth.login);
router.post('/resend-otp', auth.resendOtp);
router.put('/profile/editProfileImage', validateUserAccessToken, auth.editProfileImage);
router.post('/profile/logout', validateUserAccessToken, auth.logout);
router.post('/verify/login/otp', auth.verifyLoginOtp);
router.get('/faq/fetch', validateUserAccessToken, faq.fetchFaqs);
router.get('/profile/fetch/progress', validateUserAccessToken, fundamentals.getUserProgress);
router.get('/profile/fetch/wallet', validateUserAccessToken, wallet.fetchUserWallet);
router.get('/profile/referralsList/fetch', validateUserAccessToken, validateReferralProgramAccess, treeManagement.fetchMyEndorsedReferralData);
router.post('/store/activity-log', validateUserAccessToken, auth.storeUserActivityLog);

//BANK-DETAIL-APIS
router.post('/bankdetails/add', validateUserAccessToken, validateReferralProgramAccess, auth.addBankDetails);
router.get('/bankdetails/fetch', validateUserAccessToken, validateReferralProgramAccess, auth.fetchBankDetails);
router.put('/bankdetails/edit', validateUserAccessToken, validateReferralProgramAccess, auth.updateBankDetails);
router.delete('/bankdetails/delete', validateUserAccessToken, validateReferralProgramAccess, auth.deleteBankDetails);


//Courses_apis
router.get('/course-list/fetch', validateUserAccessToken, auth.getCoursesList);
router.post('/course/subscribe', validateUserAccessToken, auth.addUserCourse)
router.delete('/course/unsubscribe', validateUserAccessToken, auth.unsubscribeUserCourse)
router.get('/fetch/subscribedCourses', validateUserAccessToken, course.getUserSubscribedCoursesList);
router.get('/fetch/chaptersList', validateUserAccessToken, validateSpecialAccess, course.getChaptersListByUser);
router.get('/fetch/unitsList', validateUserAccessToken, validateSpecialAccess, course.fetchUnitsListByUser);
router.get('/fetch/unitsDetails', validateUserAccessToken, validateSpecialAccess, course.getUnitDetailsByUser);
router.post('/save/materialLog', validateUserAccessToken, validateSpecialAccess, course.saveMaterialLog);
router.post('/pretest/submit', validateUserAccessToken, validateSpecialAccess, course.submitPretest);
router.post('/finaltest/submit', validateUserAccessToken, validateSpecialAccess, course.submitFinaltest);
router.get('/course/performances/fetch', validateUserAccessToken, course.getUserCoursePerformances);
router.get('/course/progress/fetch', validateUserAccessToken, course.getUserCourseProgress);
router.get('/seriestests/logs/top/fetch', validateUserAccessToken, course.getUserTopSeriesTests);

//Series_APIS
router.get('/fetch/seriesList', validateUserAccessToken, series.getSeriesListbyUser);
router.get('/fetch/seriesTest', validateUserAccessToken, series.getSeriesTestByUser);
router.post('/seriesTest/submit', validateUserAccessToken, series.submitSeriesTest);


// [verifyToken, checkAccess]
router.post('/file/upload', file.upload);
router.post('/multiUpload', upload, file.multiUpload);
router.get('/fetch-uploaded-files', file.fetchAllFiles);


//Testing_PURPSOE_API's
router.post('/treeSetup', auth.treeSetup);
router.delete('/removeChildData', auth.clearChildData);
router.get('/fetchParentsData', auth.fetchParentsTreeData);
router.get('/fetchChildData', auth.fetchChildData);


//RAZORPAY_PAYMENTS
router.get('/plans/fetch', validateUserAccessToken, plans.getPlansList);

router.post('/rzp/payment/initiate', validateUserAccessToken, payment.createRzpPayment);
router.put('/rzp/payment/store', validateUserAccessToken, payment.storeRzpPayment);

//Upgrade_Payments
router.get('/upgradePlans/fetch', validateUserAccessToken, plans.getUpgradePlansList);
router.post('/rzp/upgradePlan', validateUserAccessToken, payment.upgradePlan);
router.put('/rzp/upgradePlan/payment/store', validateUserAccessToken, payment.storeUpgradePlanRzpPayment);

//Apple_Payments
router.post('/apple/payment/store', validateUserAccessToken, payment.storeApplePayment);
router.post('/apple/upgradePlan/payment/store', validateUserAccessToken, payment.storeUpgradePlanApplePayment);


//Current_Affairs
router.get('/currentAffairs/fetch', validateUserAccessToken, currentAffairs.fetchCurrentAffairsByUser);
router.post('/save/current-affair-logs', validateUserAccessToken, currentAffairs.saveCurrentAffairLog);
router.get('/fetch/topCurrentAffairs', validateUserAccessToken, currentAffairs.getTopCurrentAffairs);


//Fundamental_Apis
router.get('/fundamental-subjects-list/fetch', validateUserAccessToken, fundamentals.fetchFundamentalSubjectsListByUser);
router.get('/fundamental-units/fetch', validateUserAccessToken, validateSpecialAccess, fundamentals.fetchFundamentalUnitByUser);
router.get('/fundamental-unit-details/fetch', validateUserAccessToken, validateSpecialAccess, fundamentals.getFundamentalUnitDetailsByUser);
router.post('/fundamental-pretest/submit', validateUserAccessToken, validateSpecialAccess, fundamentals.submitFundamentalPretest);
router.post('/save/fundamental-materialLog', validateUserAccessToken, validateSpecialAccess, fundamentals.saveFundamentalMaterialLog);
router.post('/fundamental-finaltest/submit', validateUserAccessToken, validateSpecialAccess, fundamentals.submitFundamentalFinaltest);
router.get('/fundamentals/performances', validateUserAccessToken, fundamentals.getUserFundamentalPerformances);

//Support_APIS
router.get('/issues-list/fetch', validateUserAccessToken, admin.fetchIssues);
router.post('/tickets/submit', validateUserAccessToken, admin.createTicket);
router.get('/tickets-list/fetch', validateUserAccessToken, admin.fetchTicketsListByUser);


//Quiz-Api's
router.get('/quizCategoriesList/fetch', validateUserAccessToken, admin.getQuizCategoriesList);
router.get('/quizContentsList/fetch', validateUserAccessToken, currentAffairs.getQuizContentsListByUser);
router.post('/store/quizContentLog', validateUserAccessToken, currentAffairs.readQuizContent);

//Quiz-New-Api's
router.get('/quizCategoriesList/new/fetch', validateUserAccessToken, quiz.getQuizCategoriesList);
router.get('/quizContentsList/new/fetch', validateUserAccessToken, quiz.getQuizContentsListByUser);
router.post('/store/new/quizContentLog', validateUserAccessToken, quiz.readQuizContent);


//Challenge_Api's
router.get('/challenges-list/fetch', validateUserAccessToken, course.fetchActiveChallengesList);
router.post('/join-challenge', validateUserAccessToken, course.joinCourseChallenge);
router.get('/joined-challenges/fetch', validateUserAccessToken, course.fetchJoinedChallenges);
router.get('/challenges/assessment/fetch', validateUserAccessToken, course.fetchChallengeAssessment);
router.post('/challenges/assessment/submit', validateUserAccessToken, course.submitChallengeAssessment);
router.get('/challenges/assessment-logs/fetch', validateUserAccessToken, course.getChallengeAssessmentLogs);
router.get('/challenges/leaderboard/fetch', validateUserAccessToken, course.getChallengesLeaderBoard);


module.exports = router;
