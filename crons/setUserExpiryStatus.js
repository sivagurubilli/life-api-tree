let { User, EndorsedUsers } = require('../models');
const { getCurrentDateAndTime, addDaysToDate } = require("../helpers/dates");

exports.setUserTrialExpiryStatus = async () => {
    try {
        console.log("Setting user expiry trial status job started.")
        let normalUsers = await User.updateMany({ status: 1, planExpiresAt: { $lte: getCurrentDateAndTime() } }, { $set: { status: 2 } }, { multi: true });
        console.log({ expiredUsersCount: normalUsers })
        console.log("Setting user expiry trial status job completed.")
    }
    catch (e) {
        console.log(`Setting User Expiry Error:${e}`)
        console.log("Setting user expiry trial status job failed.")

    }
}
