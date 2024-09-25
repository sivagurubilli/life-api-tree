let { WalletHistory, Payment, User, Role, Otp, Plans, EndorsedUsers, BasicLevel, PendingEndorsedUsers } = require('../models')
const { generateUserLevelAndSlots, fetchParentsData, generateEndorsedLevelAndSlots, fetchEndorsedParentsData, allotEndorsedParent } = require("../controllers/treeManagement.c");
const { getCurrentDateAndTime, isValidMonthName } = require("../helpers/dates");

exports.generateEndorsedUsers = async () => {
    try {
        console.log("Generating Endorsed Users Job Started")

        let currentDate = getCurrentDateAndTime();
        let paidUsers = await User.find({
            endorsedId: { $exists: false },
            status: 4,
            $or: [
                { planExpiresAt: { $lte: currentDate } },
                { trialExpiresAt: { $lte: currentDate } }
            ]
        }).sort({ createdAt: 1 }).lean();
        paidUsers = JSON.parse(JSON.stringify(paidUsers));
        console.log({ paidUsersCount: paidUsers.length })
        if (paidUsers.length) {
            for (let user of paidUsers) {
                console.log({ user: user.mobileNo })
                let paymentData = await Payment.findOne({ _id: user.paymentId });
                let userUpdateBody = { planExpiresAt: paymentData.planExpiresAt, updatedAt: currentDate };
                let endorsedUpdateBody = { userId: user._id }

                let sponsorData = await User.findOne({ _id: user.sponsorId, status: { $nin: [0] } });
                let directReferralPoints = 0;
                if (sponsorData && sponsorData.status == 4) {
                    endorsedUpdateBody.isDirectReferral = true
                    let sponsorPayment = await Payment.findOne({ userId: user.sponsorId, paymentStatus: 1, directReferralPoints: { $exists: true } }).sort({ createdAt: -1 });
                    if (sponsorPayment) directReferralPoints = (sponsorPayment.directReferralPoints == 333 && paymentData.directReferralPoints == 333) ? 333 : 166;
                }
                else if (sponsorData && sponsorData.status != 1) {
                    endorsedUpdateBody.isDirectReferral = false
                    const baseLevelUser = await BasicLevel.findOne({});
                    sponsorData = await User.findOne({ level: baseLevelUser.level, slotNumber: baseLevelUser.slot });
                    directReferralPoints = paymentData.directReferralPoints;
                }


                let functionBody = { userId: user._id, referralCode: user.referralCode };
                if (user.sponsorCode && user.isDirectReferral) functionBody.sponsorCode = user.sponsorCode;

                //Getting Paid Endorsed UserId
                let endorsedParentId = await allotEndorsedParent({ userId: user._id });
                console.log({ endorsedParentId })
                if (endorsedParentId) functionBody.parentId = endorsedParentId;
                else throw { status: 404, message: "Endorsed user not found. Try again!" }

                //Generating Level and Slots for endorsed users and updating in endorsed users documents
                let slotsData = await generateEndorsedLevelAndSlots(functionBody);
                endorsedUpdateBody = { ...slotsData, ...endorsedUpdateBody, sponsorId: sponsorData.endorsedId, sponsorCode: sponsorData.referralCode, planStartsAt: currentDate, planExpiresAt: paymentData.planExpiresAt, createdAt: currentDate, updatedAt: currentDate }
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
                let parentsWalletPointsData = await fetchEndorsedParentsData({ endorsedUserId: endorsedUserData._id, pointsType: 1, userId: user._id });

                //Calculating Direct Referral sponsor credits
                if (endorsedUserData) {
                    const sponsorPointsData = { userId: sponsorData._id, joinerId: user._id, points: directReferralPoints, transactionType: 'credit', depositType: 'directreferralpoints', pointsType: 1 }
                    parentsWalletPointsData = [...parentsWalletPointsData, sponsorPointsData];
                }

                //Creating all parent related wallet Points
                if (parentsWalletPointsData.length) {
                    await WalletHistory.insertMany(parentsWalletPointsData);
                }
                console.log({ userUpdateBody })
                await User.findOneAndUpdate({ _id: user._id }, { $set: userUpdateBody }, { new: true })
            }
        }
        console.log("Generating Endorsed Users Job Completed")

    }
    catch (e) {
        console.log({ error: e })
        console.log(`Generating Endorsed Users Job Failed: ${e}`)
    }
}