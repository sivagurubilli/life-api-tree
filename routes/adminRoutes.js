var express = require('express');
var multer = require('multer');
var router = express.Router();
let {
    admin, quiz, auth,
    currentAffairs, subject, course,
    plans, fundamentals, faq, series
} = require('../controllers');
const { validateAdminAccessToken } = require("../middlewares/authToken");


const storage = multer.memoryStorage({
    destination: function (req, file, cb) {
        cb(null, '')
    }
});

const upload = multer({ storage: storage }).array('file', 10)

// Default Levels
// router.get('/default/referralCode', treeManagement.fetchDefaultReferralCode);

//Login-Api's
router.post('/login', admin.adminLogin);
router.get('/profile/fetch', validateAdminAccessToken, admin.fetchAdminProfile);
router.get('/fetch/visitors-list', validateAdminAccessToken, admin.getVisitiorsList);
router.get('/fetch/visitor/currentAffairLogs', validateAdminAccessToken, admin.getVisitorCurrentAffairLogs)
router.get('/fetch-user-stats', validateAdminAccessToken, auth.fetchStatsByAdmin);

//Plans-apis
router.post('/plans/add', validateAdminAccessToken, plans.addPlans);
router.get('/plans/fetch', validateAdminAccessToken, plans.getPlansList);
router.put('/plans/edit', validateAdminAccessToken, plans.editPlan);
router.delete('/plans/delete', validateAdminAccessToken, plans.deletePlan);

//Category_APIS
router.post('/category/add', validateAdminAccessToken, admin.addCategory);
router.get('/category/fetch', validateAdminAccessToken, admin.getCategoryList);
router.put('/category/edit', validateAdminAccessToken, admin.editCategory);
router.delete('/category/delete', validateAdminAccessToken, admin.deleteCategory);

//Course Api's
router.post('/course/add', validateAdminAccessToken, admin.addCourse);
router.get('/course/fetch', validateAdminAccessToken, admin.getCoursesList);
router.put('/course/edit', validateAdminAccessToken, admin.editCourse);
router.delete('/course/delete', validateAdminAccessToken, admin.deleteCourse);

//Subject APIS
router.post('/subject/add', validateAdminAccessToken, subject.addSubject);
router.get('/subject/fetch', validateAdminAccessToken, subject.getSubject);
router.put('/subject/edit', validateAdminAccessToken, subject.editSubject);
router.delete('/subject/delete', validateAdminAccessToken, subject.deleteSubject);

//COMBINATION-APIS
router.post('/combination/add', validateAdminAccessToken, subject.addCourseSubjectCombination);
router.get('/combination/fetch', validateAdminAccessToken, subject.getCourseSubjectCombination);
router.put('/combination/edit', validateAdminAccessToken, subject.editCourseSubjectCombination);
router.delete('/combination/delete', validateAdminAccessToken, subject.deleteCourseSubjectCombination);

//Chapter_APIS
router.post('/chapter/add', validateAdminAccessToken, course.addChapter);
router.get('/chapter/fetch', validateAdminAccessToken, course.getChapters);
router.put('/chapter/edit', validateAdminAccessToken, course.editChapter)
router.delete('/chapter/delete', validateAdminAccessToken, course.deleteChapter);

//UNITS_APIS
router.post('/units/add', validateAdminAccessToken, course.addUnit);
router.get('/units/fetch', validateAdminAccessToken, course.getUnits);
router.put('/units/edit', validateAdminAccessToken, course.editUnits);
router.delete('/units/delete', validateAdminAccessToken, course.deleteUnit);

//MATERIAL_APIS
router.post('/materials/add', validateAdminAccessToken, course.addMaterial);
router.get('/materials/fetch', validateAdminAccessToken, course.getMaterials);
router.put('/materials/edit', validateAdminAccessToken, course.editMaterial);
router.delete('/materials/delete', validateAdminAccessToken, course.deleteMaterial);

//PRETEST_APIS
router.post('/pretests/add', validateAdminAccessToken, course.addPretest);
router.get('/pretests/fetch', validateAdminAccessToken, course.getPretests);
router.put('/pretests/edit', validateAdminAccessToken, course.editPretest);
router.delete('/pretests/delete', validateAdminAccessToken, course.deletePretest);

//FINALTEST_APIS
router.post('/finaltests/add', validateAdminAccessToken, course.addFinaltest);
router.get('/finaltests/fetch', validateAdminAccessToken, course.getFinaltests);
router.put('/finaltests/edit', validateAdminAccessToken, course.editFinaltest);
router.delete('/finaltests/delete', validateAdminAccessToken, course.deleteFinaltest);


//Current_AFFAIR_APIS
router.post('/currentAffairs/add', validateAdminAccessToken, currentAffairs.addCurrentAffairs);
router.get('/currentAffairs/fetch', validateAdminAccessToken, currentAffairs.fetchCurrentAffairsByAdmin);
router.put('/currentAffairs/edit', validateAdminAccessToken, currentAffairs.editCurrentAffairs);
router.delete('/currentAffairs/delete', validateAdminAccessToken, currentAffairs.deletCurrentAffairs);

//PLANS_APIS
router.post('/fundamentals/subjects/add', validateAdminAccessToken, fundamentals.addFundamentalSubject);
router.get('/fundamentals/subjects/fetch', validateAdminAccessToken, fundamentals.getFundamentalSubject);
router.put('/fundamentals/subjects/edit', validateAdminAccessToken, fundamentals.editFundamentalSubject);
router.delete('/fundamentals/subjects/delete', validateAdminAccessToken, fundamentals.deleteFundamentalSubject);

//PLANS_APIS
router.post('/fundamentals/chapters/add', validateAdminAccessToken, fundamentals.addFundamentalChapter);
router.get('/fundamentals/chapters/fetch', validateAdminAccessToken, fundamentals.getFundamentalChapters);
router.put('/fundamentals/chapters/edit', validateAdminAccessToken, fundamentals.editFundamentalChapter);
router.delete('/fundamentals/chapters/delete', validateAdminAccessToken, fundamentals.deleteFundamentalChapter);

//PLANS_APIS
router.post('/fundamentals/units/add', validateAdminAccessToken, fundamentals.addFundamentalUnit);
router.get('/fundamentals/units/fetch', validateAdminAccessToken, fundamentals.getFundamentalUnits);
router.put('/fundamentals/units/edit', validateAdminAccessToken, fundamentals.editFundamentalUnits);
router.delete('/fundamentals/units/delete', validateAdminAccessToken, fundamentals.deleteFundamentalUnit);

//MATERIAL_APIS
router.post('/fundamentals/materials/add', validateAdminAccessToken, fundamentals.addFundamentalMaterial);
router.get('/fundamentals/materials/fetch', validateAdminAccessToken, fundamentals.getFundamentalMaterial);
router.put('/fundamentals/materials/edit', validateAdminAccessToken, fundamentals.editFundamentalMaterial);
router.delete('/fundamentals/materials/delete', validateAdminAccessToken, fundamentals.deleteFundamentalMaterial);

//PRETEST_APIS
router.post('/fundamentals/pretests/add', validateAdminAccessToken, fundamentals.addFundamentalPretest);
router.get('/fundamentals/pretests/fetch', validateAdminAccessToken, fundamentals.getFundamentalPretests);
router.put('/fundamentals/pretests/edit', validateAdminAccessToken, fundamentals.editFundamentalPretest);
router.delete('/fundamentals/pretests/delete', validateAdminAccessToken, fundamentals.deleteFundamentalPretest);

//FINALTEST_APIS
router.post('/fundamentals/finaltests/add', validateAdminAccessToken, fundamentals.addFundamentalFinaltest);
router.get('/fundamentals/finaltests/fetch', validateAdminAccessToken, fundamentals.getFundamentalFinaltests);
router.put('/fundamentals/finaltests/edit', validateAdminAccessToken, fundamentals.editFundamentalFinaltest);
router.delete('/fundamentals/finaltests/delete', validateAdminAccessToken, fundamentals.deleteFundamentalFinaltest);

//FAQ_APIS
router.post('/faq/add', validateAdminAccessToken, faq.createFaq);
router.get('/faq/fetch', validateAdminAccessToken, faq.fetchFaqs);
router.put('/faq/edit', validateAdminAccessToken, faq.editFaq);
router.delete('/faq/delete', validateAdminAccessToken, faq.deleteFaq);

//Issue_APIS
router.post('/issues/add', validateAdminAccessToken, admin.addIssues);
router.get('/issues/fetch', validateAdminAccessToken, admin.fetchIssues);
router.put('/issues/edit', validateAdminAccessToken, admin.editIssues);
router.delete('/issues/delete', validateAdminAccessToken, admin.deleteIssues);

//User_APIS
router.get('/getUsersList', validateAdminAccessToken, admin.getUsersList);
router.get('/getUserDetails', validateAdminAccessToken, admin.getUserDetails)
router.get('/getPaymentsList', validateAdminAccessToken, admin.fetchUserPayments);
router.get('/getTicketsList', validateAdminAccessToken, admin.fetchTicketsListByAdmin);
router.post('/closeTicket', validateAdminAccessToken, admin.closeTicket);
router.get('/ticket/statistics', validateAdminAccessToken, admin.fetchTicketStatistics);
router.post('/assign-plan-to-users', validateAdminAccessToken, admin.assignPlanToUsers);

//Series_APIS
router.post('/series/add', validateAdminAccessToken, series.addSeries);
router.get('/series/fetch', validateAdminAccessToken, series.getSeriesList);
router.put('/series/edit', validateAdminAccessToken, series.editSeries);
router.delete('/series/delete', validateAdminAccessToken, series.deleteSeries);

router.post('/seriestests/add', validateAdminAccessToken, series.addSeriesTest);
router.get('/seriestests/fetch', validateAdminAccessToken, series.getSeriesTests);
router.put('/seriestests/edit', validateAdminAccessToken, series.editSeriesTest);
router.delete('/seriestests/delete', validateAdminAccessToken, series.deleteSeriesTest);
router.patch('/seriestests/addQuestions', validateAdminAccessToken, series.addSeriesTestQuestions);

//Quiz-Apis
router.post('/quizCategory/add', validateAdminAccessToken, admin.addQuizCategory);
router.get('/quizCategory/fetch', validateAdminAccessToken, admin.getQuizCategoriesList);
router.put('/quizCategory/edit', validateAdminAccessToken, admin.editQuizCategory);
router.delete('/quizCategory/delete', validateAdminAccessToken, admin.deleteQuizCategory);

//Quiz-ContentApis
router.post('/quizContent/add', validateAdminAccessToken, admin.addQuizContent);
router.get('/quizContent/fetch', validateAdminAccessToken, admin.getQuizContentList);
router.put('/quizContent/edit', validateAdminAccessToken, admin.editQuizContent);
router.delete('/quizContent/delete', validateAdminAccessToken, admin.deleteQuizContent);

//Quiz-Apis
router.post('/quizCategory/new/add', validateAdminAccessToken, quiz.addQuizCategory);
router.get('/quizCategory/new/fetch', validateAdminAccessToken, quiz.getQuizCategoriesList);
router.put('/quizCategory/new/edit', validateAdminAccessToken, quiz.editQuizCategory);
router.delete('/quizCategory/new/delete', validateAdminAccessToken, quiz.deleteQuizCategory);

//Quiz-ContentApis
router.post('/quizContent/new/add', validateAdminAccessToken, quiz.addQuizContent);
router.get('/quizContent/new/fetch', validateAdminAccessToken, quiz.getQuizContentList);
router.put('/quizContent/new/edit', validateAdminAccessToken, quiz.editQuizContent);
router.delete('/quizContent/new/delete', validateAdminAccessToken, quiz.deleteQuizContent);

//Activity-Apis
router.get('/userActivities/fetch', validateAdminAccessToken, admin.fetchUserActivityLogs);

//Assessment-Apis
router.post('/assessment/add', validateAdminAccessToken, admin.addAssessment);
router.get('/assessment/fetch', validateAdminAccessToken, admin.getAssessments);
router.put('/assessment/edit', validateAdminAccessToken, admin.editAssessment);
router.delete('/assessment/delete', validateAdminAccessToken, admin.deleteAssessment);

//Challenge-Apis
// router.post('/assessment/add', validateAdminAccessToken, admin.addChallenge);
router.post('/challenges/add', validateAdminAccessToken, admin.addChallenge);
router.get('/challenges/fetch', validateAdminAccessToken, admin.getChallengesList);
router.put('/challenges/edit', validateAdminAccessToken, admin.editChallenge);
router.get('/challenges/leaderboard/fetch', validateAdminAccessToken, course.getChallengesLeaderBoard);
router.post('/challenges/add-winner', validateAdminAccessToken, course.addChallengeWinner);


module.exports = router;
