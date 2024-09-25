const { User, Role, LoginHistory } = require("../models");
let appUtils = require('../utils/appUtils');
let { isValidUser, checkAvailableDenominations, capitalizeEveryInnerWord, responseJson, sendMail, isRequestDataValid, } = appUtils
const moment = require("moment");

exports.checkLoginAttempts = async (body) => {
    try {
        const { userId, role } = body;
        const currentDate = moment(new Date()).format('YYYY-MM-DD');
        const currentMonthStartDate = (moment(currentDate).startOf('month')).format('YYYY-MM-DD');
        const currentMonthEndDate = (moment(currentDate).endOf('month')).format('YYYY-MM-DD');

        const todayLoginAttempts = await LoginHistory.find({ userId, lastLoginTime: { $gte: `${currentDate}T00:00:00.000Z`, $lt: `${currentDate}T23:59:59.999Z` } })
        const currentMonthLoginAttempts = await LoginHistory.find({ userId, lastLoginTime: { $gte: `${currentMonthStartDate}T00:00:00.000Z`, $lt: `${currentMonthEndDate}T23:59:59.999Z` } })
        console.log({ todayLoginAttempts: todayLoginAttempts.length })
        console.log({ currentMonthLoginAttempts: currentMonthLoginAttempts.length })
        if (todayLoginAttempts.length >= 3) throw { statusCode: 405, msg: "Daily login limit is reached.Try after 24 hours" }
        if (currentMonthLoginAttempts.length >= 10) throw { statusCode: 405, msg: "Monthly login limit is reached.Try login next month" }

        return true;
    }
    catch (e) {
        throw e
    }
}

exports.checkValidUser = async (body) => {
    try {
        const { userId } = body;
        const userData = await User.findOne({ _id: userId, isDeleted: false })
        if (!userData) throw Error("UserId is not valid.Please Try again")
        const isActiveUser = await User.findOne({ _id: userId, isActive: true }).populate([{ path: 'roles', select: 'name' }])
        if (!isActiveUser) throw Error("Your account is inactive.Please try subscription or Contact support team")
        return isActiveUser;
    }
    catch (e) {
        throw e
    }
}

exports.isActiveSubscriber = async (body) => {
    try {
        const { userId } = body;
        const data = await User.findOne({ _id: userId })
        if (!data) throw Error("UserId is not valid.Please Try again")

        let startDate = moment(data.planStartsAt).format('YYYY-MM-DD');
        let endDate = moment(data.planExpiresAt).format('YYYY-MM-DD');
        let currentDate = moment(new Date()).format('YYYY-MM-DD');
        return currentDate >= startDate && currentDate <= endDate;
    }
    catch (e) {
        throw e
    }
}

exports.generateHourlyData = (data) => {
    const result = [];
    const formatHour = (hour) => (hour < 10 ? `0${hour}` : `${hour}`);
    const initializeHoursForDate = (dateString) => {
        const resultEntry = {
            date: dateString,
            data: {},
        };
        for (let hour = 0; hour < 24; hour++) {
            const hourString = `${formatHour(hour)}:00 - ${formatHour(hour + 1)}:00`;
            resultEntry.data[hourString] = 0;
        }
        result.push(resultEntry);
    };

    data.forEach((entry) => {
        const date = new Date(entry.createdAt);
        const dateString = date.toISOString().split('T')[0];
        const resultEntry = result.find((entry) => entry.date === dateString);
        if (!resultEntry) {
            initializeHoursForDate(dateString);
        }
        const hourString = `${formatHour(date.getUTCHours())}:00 - ${formatHour(date.getUTCHours() + 1)}:00`;
        const updatedResultEntry = result.find((entry) => entry.date === dateString);
        updatedResultEntry.data[hourString]++;
    });
    return result;
}
