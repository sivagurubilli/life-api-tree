const CronJob = require("cron").CronJob;
// const { assignCallsToUsers } = require("../controllers/calls.c");
const { setUserTrialExpiryStatus } = require("./setUserExpiryStatus");
const { generateEndorsedUsers } = require("./generateEndorsedUsers");
exports.cronSchedulars = async () => {

    //Assigning Calls to users everyday at every day 12:00AM IST
    // new CronJob('0 0 * * *', async () => {
    //     console.log("Assigning Calls Job triggered")
    //     await assignCallsToUsers();
    // }, null, true, 'Asia/Kolkata');

    //Updating Trial users expiry status everyday at every day 12:00AM IST
    new CronJob('0 0 * * *', async () => {
        console.log("Setting Users Trial Expiry status job triggered")
        await setUserTrialExpiryStatus();
    }, null, true, 'Asia/Kolkata');

    //Updating Trial users expiry status everyday at every day 12:05AM IST
    new CronJob('5 0 * * *', async () => {
        console.log("Generating Endorsed Users Job Triggered")
        await generateEndorsedUsers();
    }, null, true, 'Asia/Kolkata');

}