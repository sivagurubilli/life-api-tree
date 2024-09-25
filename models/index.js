module.exports = {
    User: require('./user.m'),
    Otp: require('./otp.m'),
    Role: require('./role.m'),
    BasicLevel: require("./basicLevel.m"),
    Category: require('./category.m'),
    Course: require('./course.m'),
    Subject: require("./subjects.m"),
    CourseSubjectCombination: require("./courseSubjectCombinations.m"),
    Chapter: require("./chapters.m"),
    Unit: require("./units.m"),
    Material: require("./material.m"),
    PreTest: require("./pretest.m"),
    FinalTest: require("./finaltest.m"),
    UserCourse: require('./usercourses.m'),
    UserCourseUnlockCounter: require("./userCourseUnlockCounters.m"),
    UserMaterialLogs: require("./userMaterialLogs.m"),
    UserPretestLogs: require("./userPretestLogs.m"),
    UserFinaltestLogs: require("./userFinalTestLogs.m"),
    UserCourseTestLogs: require("./userCourseTestLogs.m"),
    WalletHistory: require("./walletHistory.m"),
    LevelPoints: require("./levelPoints.m"),
    CurrentAffairs: require("./currentAffairs.m"),
    UserCurrentAffairLogs: require("./userCurrentAffairLogs.m"),
    Plans: require("./plans.m"),
    Payment: require('./payment.m'),
    EndorsedUsers: require('./endorsedUsers.m'),
    FundamentalSubject: require("./fundamentalSubjects.m"),
    FundamentalChapter: require("./fundamentalChapters.m"),
    FundamentalUnit: require("./fundamentalUnits.m"),
    FundamentalMaterial: require("./fundamentalMaterials.m"),
    FundamentalFinalTest: require("./fundamentalFinalTests.m"),
    FundamentalPreTest: require("./fundamentalPretests.m"),
    UserFundamentalUnlockCounters: require("./userFundamentalUnlockCounters.m"),
    UserFundamentalMaterialLogs: require("./userFundamentalMaterialLogs.m"),
    UserFundamentalPreTestLogs: require("./userFundamentalPretestLogs.m"),
    UserFundamentalFinalTestLogs: require("./userFundamentalFinaltestLogs.m"),
    PendingEndorsedUsers: require("./pendingEndorsedUsers.m"),
    UserFundamentalTestLogs: require("./userFundamentalTestLogs.m"),
    Faq: require("./faq.m"),
    Issues: require("./issues.m"),
    Tickets: require("./tickets.m"),
    Visitor: require("./visitors.m"),
    VisitorCurrentAffairLogs: require("./visitorCurrentAffairLogs.m"),
    LoginHistory: require("./loginHistory.m"),
    BankDetails: require("./bankDetails.m"),

    //
    Series: require("./series.m"),
    SeriesTest: require("./seriesTest.m"),
    UserSeriesTestLogs: require("./userSeriesTestLogs.m"),
    QuizCategory: require("./quizCategory.m"),
    QuizContent: require("./quizContent.m"),
    QuizCategoryNew: require("./quizCategoryNew.m"),
    QuizContentNew: require("./quizContentNew.m"),

    UserQuizLogs: require("./userQuizLogs.m"),
    UserQuizLogsNew: require("./userQuizLogsNew.m"),
    UserActivityLogs: require("./userActivityLogs.m"),

    //Challenges_Apis
    Assessment: require("./assessment.m"),
    UserChallenges: require("./userChallenges.m"),
    UserAssessmentLogs: require("./userAssessmentLogs.m"),
    Challenges: require("./challenges.m"),
    ChallengeWinners: require("./challengeWinners.m")
}
