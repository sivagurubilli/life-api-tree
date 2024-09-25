
const moment = require('moment');

exports.getPreviousTuesday = (date) => {
    const day = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const daysToSubtract = (day + 5) % 7; // Calculate how many days to subtract to get to the last Tuesday
    const lastTuesdayDate = new Date(date);
    lastTuesdayDate.setDate(date.getDate() - daysToSubtract);
    return lastTuesdayDate.toISOString().slice(0, 10);
};

exports.getNextMonday = (date) => {
    const day = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const daysToAdd = (8 - day) % 7; // Calculate how many days to add to get to the next Monday
    const nextMondayDate = new Date(date);
    nextMondayDate.setDate(date.getDate() + daysToAdd);
    return nextMondayDate.toISOString().slice(0, 10);
};

exports.getCurrentDateAndTime = () => {
    const now = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
    const indianTime = new Date(now.getTime() + ISTOffset);
    return indianTime;
}

exports.getCurrentDate = () => {
    const now = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
    const indianDate = new Date(now.getTime() + ISTOffset);
    return indianDate.toISOString().split('T')[0];
}

exports.getTomorrowDate = () => {
    const now = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const indianDate = new Date(now.getTime() + ISTOffset);

    // Get tomorrow's date
    let tomorrow = new Date(indianDate);
    tomorrow.setDate(indianDate.getDate() + 1);
    const tomorrowISOString = tomorrow.toISOString().substring(0, 10);
    return tomorrowISOString;
}

exports.getTomorrowDateAndTime = () => {
    const now = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const indianDate = new Date(now.getTime() + ISTOffset);

    // Get tomorrow's date
    let tomorrow = new Date(indianDate);
    tomorrow.setDate(indianDate.getDate() + 1);
    return tomorrow;
}

exports.addDaysToDate = (days) => {
    const currentDate = exports.getCurrentDateAndTime();
    const daysToAdd = parseInt(days);
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    const customDate = currentDate.toISOString();
    return customDate;
}

exports.isValidMonthName = (monthName) => {
    try {

        const validMonthNames = [
            'january', 'february', 'march', 'april',
            'may', 'june', 'july', 'august',
            'september', 'october', 'november', 'december'
        ];
        const lowercaseMonthName = monthName.toLowerCase();
        if (validMonthNames.includes(lowercaseMonthName) == false) throw { status: 400, message: "Invalid month name!" }
    }
    catch (e) {
        throw e
    }
}

exports.isTrailPeriodCompleted = (currentDate, expiryDate) => {
    console.log({ currentDate, expiryDate })
    const date1 = moment(currentDate);
    let date2 = moment(expiryDate).subtract(8, 'days').format()
    date2 = moment(date2).utcOffset('+05:30');
    console.log({ date1, date2 })
    return date1.isAfter(date2);
}

exports.getDaysDifference = (date1, date2) => {
    date1 = new Date(date1);
    date2 = new Date(date2);
    // Calculate the difference in milliseconds
    const differenceInMs = date2 - date1;
    // Convert milliseconds to days
    return Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
}

exports.getAddedNextDate = (date, days) => {
    const currentDate = new Date(date);
    const daysToAdd = parseInt(days);
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    const customDate = currentDate.toISOString();
    return customDate;
}
