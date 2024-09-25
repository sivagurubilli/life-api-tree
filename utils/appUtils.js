'use strict'

var multer = require('multer');
var axios = require('axios');
var multerS3 = require('multer-s3');
var crypto = require('crypto');
var pug = require("pug");
const path = require("path");
const config = require('../config/config')
const emailTemplates = path.resolve(__dirname, "../views/emailTemplates/");
var s3Uploader = multer({
  storage: multerS3(config.multerStorage),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('file');
var localUploader = multer({ storage: multer.diskStorage(config.localStorage) }).single('file')
var { xml2js, parseString } = require('xml2js');
var fs = require('fs');
var Handlebars = require('handlebars');
const { isNullOrUndefined } = require('util');
const { firebaseAdm } = require("../config/config");
var notify = firebaseAdm.messaging();
const moment = require('moment');
const puppeteer = require('puppeteer');
const { promisify } = require('util')
const models = require('../models');
let { User, Otp, Payment, Notification, CronTask } = models;
const { listeners } = require('process');
const component = 'appUtils'
const { environment } = require("../config/config");
const { ToWords } = require('to-words');
const { getCurrentDateAndTime, addDaysToDate } = require("../helpers/dates");




let functions = {}
functions.responseJson = (status, data, message, error, dataCount) => {
  let err = {}
  if (error) {
    if (error.status || error.error) {
      err = { ...error }
    } else {
      err.message = error.message
      err.data = JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 240)
    }
  }
  return { status, data, message, error: err, dataCount }
}



functions.uploadFile = async (req, res) => {
  return new Promise((resolve, reject) => {
    s3Uploader(req, res, function (err) {
      if (err) {
        console.log("Error", err)
        reject(err)
      } else if (!req.file) {
        reject(Error('Something went wrong'))
      } else {
        resolve(req.file)
      }
    })
  })
}



functions.firstCapital = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

functions.sendNotice = async (params) => {
  try {
    let { title, options, body, userToken, userId, data } = params

    // var payload = {
    //   notification: {
    //     title,
    //     body: body,
    //   },
    //   apns: {
    //     payload: {
    //       aps: {
    //         contentAvailable: true,
    //       },
    //     }
    //   },
    //   headers: {
    //     //"apns-push-type": "background", // This line prevents background notifications to be displayed
    //     "apns-priority": "10",
    //   },
    //   data
    // }
    var payload = {
      notification: {
        title,
        body: body
      },
      data
    }
    console.log({ userToken, payload, options }, 'before sending notifications')
    let resp = await notify.sendToDevice(userToken, payload, options)
    console.log({ resp }, 'after sending notifications')

    // let notifyData = new Notification({
    //   title,
    //   body,
    //   userId
    // })
    // notifyData = await notifyData.save()
    // console.log({ notifyData }, 'data after saving notifications')
    return resp
  } catch (e) {
    throw e
  }
}



functions.generateOtp = () => {
  if (environment != "prod") {
    return '111111';
  }
  if (environment == "prod") {
    let otp = Math.floor(100000 + Math.random() * 900000);
    if ((otp.toString()).length != 6) functions.generateOtp();
    return otp;
  }
}

//For generating dynamic numbers
functions.generateDynamicUniqueNumber = (length) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(randomNumber).padStart(length, '0');
}

functions.formatNumberWithLeadingZeros = (number) => {
  return number < 10000 ? String(number).padStart(4, '0') : String(number);
};

functions.generateReferralCode = async (body) => {
  try {

    let { level } = body;
    if (!level) throw Error("Level is not generated")
    level = functions.formatNumberWithLeadingZeros(level);
    const maxLength = 15;
    let referralCode = `L${level}R`;
    const referralcodeLength = parseInt(referralCode.length);
    const randomNumber = functions.generateDynamicUniqueNumber(maxLength - referralcodeLength);
    referralCode = `L${level}R${randomNumber}`;
    const checkReferral = await User.findOne({ referralCode: referralCode });
    if (checkReferral) await functions.generateReferralCode({ level });
    return referralCode;
  }
  catch (e) {
    throw e
  }
}


functions.sendMobileSms = async (body) => {
  let { mobileNo, message, otp } = body
  if (!mobileNo) throw Error('mobileNo not found')
  if (!message) throw Error('message not found')

  let {
    url
  } = config.smsApi


  let smsUrl = url.replace('{message}', message)
    .replace('{mobileNo}', mobileNo)


  try {
    if (environment == "prod") { let smsRes = await axios.get(smsUrl) }
    if (otp) {
      let otpRes = await Otp.findOneAndUpdate({ mobileNo }, { $set: { otp, mobileNo } }, { new: true, upsert: true })
      if (!otpRes) throw Error('Otp saving error')
      otpRes.otp = undefined
      return otpRes
    }
    else {
      return { smsRes: null };
    }

  } catch (e) {
    console.error(e, 'e')
    throw e
  }
}

functions.sendMail = async (mailData) => {
  try {
    let {
      projectName,
      project
    } = config

    console.log("MAilData", mailData);

    const emailFilePath = path.join(emailTemplates, `${mailData.type}.pug`);
    mailData.options.project = project
    mailData.options.projectName = projectName
    let html = pug.renderFile(emailFilePath, mailData.options)
    let subject = mailData.subject;

    let attachments = []
    if (mailData.options
      && mailData.options.attachments
      && mailData.options.attachments.length
    ) {
      attachments = mailData.options.attachments
    }

    let from = config.supportEmail
    const mailOptions = {
      from, // sender address
      to: mailData.to, // list of receivers
      subject, // Subject line
      html,
      attachments
    };
    return config.mailer.sendMail(mailOptions, function (err, info) {
      if (err) throw err
      console.log({ mailRes: info })
      return info
    });
  } catch (e) {
    throw e
  }
}





functions.invoiceGen = async (body) => {
  try {
    const { s3, bucket } = config.multerStorage;
    const html = fs.readFileSync(path.resolve(__dirname, `../views/invoiceTemplates/${body.fileName}`), 'utf8');
    const template = Handlebars.compile(html);
    const finalHtml = template(body);
    const fileName = `invoice-${body.invoiceNumber}.pdf`;
    const pdf = await functions.generatePDF(finalHtml);
    const invoiceLink = await functions.savePdf(pdf, fileName, `invoices/${environment}/${fileName}`);
    return invoiceLink.Location;
  } catch (error) {
    throw error;
  }
};


functions.generatePDF = async (html = "") => {
  console.log({ environment })
  // let launchConfig = environment == 'local' ? {} : {
  //   executablePath: '/usr/bin/chromium-browser'
  // }
  // console.log({ launchConfig })

  const browser = await puppeteer.launch({ headless: "new" });
  let page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ printBackground: true });
  await page.close();
  if (browser != null) {
    await browser.close();
  }
  return pdfBuffer;
};

functions.savePdf = async (bufferData, fileName, key, contentType) => {
  try {
    if (!contentType) contentType = 'application/pdf';
    const { s3, bucket } = config.multerStorage
    return await s3.upload({
      Bucket: bucket,
      Key: key,
      Body: bufferData,
      contentType,
      ServerSideEncryption: 'AES256'
    }).promise();
  } catch (e) {
    throw e
  }
}

functions.localFileS3 = (body) => {
  return new Promise((resolve, reject) => {
    try {
      let { filePath, fileName, fileOrignalPath } = body
      if (!filePath) throw Error('filePath is required')
      if (!fileName) throw Error('fileName is required')
      if (!fileOrignalPath) throw Error('fileOrignalPath is required')

      let { s3, bucket } = config.multerStorage

      fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        const params = {
          Bucket: bucket, // pass your bucket name
          Key: `invoices/${fileName}`, // file will be saved as testBucket/contacts.csv
          Body: data,
          contentType: 'application/pdf'
        };
        s3.upload(params, function (s3Err, data) {
          if (s3Err) reject(s3Err)
          console.log(data, 'data')
          if (data && data.Location) {
            console.log(filePath, 'filepat')
            fs.unlink(filePath, (err, res) => {
              console.log(err, res, 'fs')
              fs.unlink(fileOrignalPath, (err, res) => {
                console.log(err, res, 'fs2')
              })
            })
            resolve(data.Location)
          } else {
            fs.unlink(filePath, (err, res) => {
              reject('Upload failed')
            })
          }
        });
      });
    } catch (error) {
      console.log(error, 'ewrror')
      reject(error)
    }
  })
}

functions.isRequestDataValid = (params) => {
  try {
    if (typeof params !== 'object') {
      throw Error('not an object')
    }

    let invalidKeys = [];
    let invalidValues = [];

    for (let [key, value] of Object.entries(params)) {
      if (isNullOrUndefined(params[key])) {
        invalidKeys.push(key)
      }
      else if (!value && typeof value !== 'number' && typeof value !== 'boolean') {
        invalidValues.push(key)
      }
    }

    if (invalidKeys.length) {
      return `${invalidKeys[0]} is a required field`
    } else if (invalidValues.length) {
      return `${invalidValues[0]} getting blank value`
    }
    else return true
  } catch (e) {
    throw e
  }
}

/**
 * @param {object} params 
 * @param {string} reqId 
 * @returns 
 */
functions.getMilisecondsFromDateTime = (date, time, reqId) => {
  return new Date(`${date} ${time}`).getTime();
}




functions.getNextTicketNumber = async (modelName, fieldName) => {
  let ticketNumber = 10;

  let lastRecord = await models[modelName].find({}).sort({ _id: -1 }).limit(1);
  if (lastRecord.length && lastRecord[0][fieldName]) {
    ticketNumber = parseInt(lastRecord[0][fieldName]) + 1
  }
  return ticketNumber.toString().padStart(6, "0")
};

functions.numberOfNightsBetweenDates = (startDate, endDate) => {
  var a = moment(startDate, 'MM/DD/YYYY');
  var b = moment(endDate, 'MM/DD/YYYY');
  return b.diff(a, 'days');
}



functions.sampleFirebaseToken = 'egZSBaKoQ-OSR24mL6QNxk:APA91bFPvKdMZCzqkc5SrM6J_pRCFJDqejZPSnA7aAhsX1LlCKlFM0zoSzZ6EDnckFm4pUT7PT1OuM2Via-jztL4YewagD2_iv4AOE_gQmH0dMwmYD4I-Hkg5PkxfUG1amf71BlesId9'

functions.generateSlotNumber = (number) => {
  let startValue = parseInt(number);
  const result = [];
  const start = (startValue - 1) * 3 + 1;

  for (let i = start; i < start + 3; i++) {
    result.push(i);
  }

  return result;
}



functions.fetchNextAvailableSlotPosition = async (data) => {

  // Sort the array based on level in ascending order
  data.sort((a, b) => a.level - b.level);

  // Sort the slotNumber within each object in ascending order
  data.forEach(obj => {
    if (obj.hasOwnProperty('leftChild') && obj.hasOwnProperty('middleChild') && obj.hasOwnProperty('rightChild')) {
      const { leftChild, middleChild, rightChild } = obj;
      obj.leftChild = Array.isArray(leftChild) ? leftChild.sort((a, b) => a.slotNumber - b.slotNumber) : leftChild;
      obj.middleChild = Array.isArray(middleChild) ? middleChild.sort((a, b) => a.slotNumber - b.slotNumber) : middleChild;
      obj.rightChild = Array.isArray(rightChild) ? rightChild.sort((a, b) => a.slotNumber - b.slotNumber) : rightChild;
    }
  });

  // Create a new array to hold the result
  let result = [];

  // Iterate over each object in the data array
  data.forEach(obj => {
    // Get the missing child properties
    const missingChilds = [];
    if (!obj.hasOwnProperty('leftChild')) missingChilds.push('leftChild');
    if (!obj.hasOwnProperty('middleChild')) missingChilds.push('middleChild');
    if (!obj.hasOwnProperty('rightChild')) missingChilds.push('rightChild');

    // Create a new object for each missing child property
    missingChilds.forEach(child => {
      const newObj = { ...obj, missingChilds: child };
      result.push(newObj);
    });
  });


  result = result.sort((a, b) => {
    // Sort by level in ascending order
    if (a.level !== b.level) {
      return a.level - b.level;
    }

    // Sort by missingChilds
    const order = ['leftChild', 'middleChild', 'rightChild'];
    return order.indexOf(a.missingChilds) - order.indexOf(b.missingChilds);
  });

  return result;
}

functions.fetchChildSlotPosition = async (childType) => {
  let slotPosition;
  if (childType == "leftChild") slotPosition = "left";
  else if (childType == "middleChild") slotPosition = "middle";
  else if (childType == "rightChild") slotPosition = "right";
  return slotPosition;
}


functions.generateSlotNumberWithchildSlotPosition = (slotNumber, childSlotPosition) => {
  let startValue = parseInt(slotNumber);
  const result = [];
  let nextSlotNumber;
  const start = (startValue - 1) * 3 + 1;

  for (let i = start; i < start + 3; i++) {
    result.push(i);
  }
  if (childSlotPosition == "left") nextSlotNumber = result[0];
  if (childSlotPosition == "middle") nextSlotNumber = result[1];
  if (childSlotPosition == "right") nextSlotNumber = result[2];

  return nextSlotNumber;
}



functions.fetchMaximumSlotsPerLevel = (level) => {
  const maxSlots = 3 ** (level - 1);
  return maxSlots;
}

functions.isValidSlotForLevel = (body) => {
  const { slot, level } = body;
  return slot > 0 && level > 0 && slot <= 3 ** (level - 1);
}

functions.isActiveSubscriber = (start_date, end_date) => {
  let startDate = moment(start_date).format('YYYY-MM-DD');
  let endDate = moment(end_date).format('YYYY-MM-DD');
  let currentDate = moment(new Date()).format('YYYY-MM-DD');
  return currentDate >= startDate && currentDate <= endDate;

}

functions.generateEachLevelSlotsArray = (level) => {
  const initialLevel = (level) ? level : 12;
  const slotsArray = [];

  for (let level = 2; level <= (initialLevel + 1); level++) {
    const slots = 3 ** (level - 1);
    slotsArray.push({ level: level - 1, maximumSlots: slots });
  }
  return slotsArray;
};

functions.generateAge = (dob) => {
  const dobValue = new Date(dob); // Replace with your DOB value
  const currentDate = new Date();
  const ageInMilliseconds = currentDate - dobValue;
  const ageInYears = Math.floor(ageInMilliseconds / (365 * 24 * 60 * 60 * 1000));
  return ageInYears;
}

functions.checkAvailableDenominations = (amount) => {
  return (amount % 100 == 0) ? true : false;
}



functions.isValidUser = async (userId) => {
  try {
    const userData = await User.findOne({ _id: userId, isDeleted: false })
    if (!userData) throw Error("UserId is not valid.Please Try again")
    const isActiveUser = await User.findOne({ _id: userId, isActive: true })
    if (!isActiveUser) throw Error("Your account is inactive.Please Contact support team or try subscription")
    return isActiveUser;
  }
  catch (e) {
    throw e
  }
}

functions.getNextThursday = (currentDate) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayIndex = currentDate.getDay();
  const daysUntilNextThursday = (4 - currentDayIndex + 7) % 7;   // Find days until the next Thursday
  const nextThursday = new Date(currentDate.getTime() + daysUntilNextThursday * 24 * 60 * 60 * 1000);
  return nextThursday;
}

functions.getWithdrawlPayoutDate = (requestDate) => {
  console.log({ requestDate })
  const currentDayIndex = requestDate.getDay();
  const mondayDeadline = new Date(requestDate);
  mondayDeadline.setHours(23, 59, 0, 0); // Setting Monday midnight as deadline

  if (currentDayIndex <= 1 && requestDate <= mondayDeadline) {
    // Process redemption request before or on Monday deadline
    return functions.getNextThursday(requestDate);
  } else {
    // Process redemption request after Monday deadline
    const nextMonday = new Date(requestDate);
    nextMonday.setDate(requestDate.getDate() + ((1 + 7 - currentDayIndex) % 7)); // Find next Monday
    return functions.getNextThursday(nextMonday);
  }
}

functions.toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: { // can be used to override defaults for the selected locale
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: {
        name: 'Paisa',
        plural: 'Paise',
        symbol: '',
      },
    }
  }
});

functions.calculateAssessmentPercentage = (Ques, responses, QuesCount) => {
  const totalQuestions = (QuesCount && QuesCount > 0) ? QuesCount : Ques.length;
  let correctAnswers = 0;

  responses = responses.map(response => {
    const question = Ques.find(q => (q._id).toString() === (response.questionId).toString());
    response.correctOption = question.correctOption;

    if (question && parseInt(question.correctOption) === parseInt(response.selectedOption)) {
      correctAnswers++;
      response.isAnswerCorrect = 1;
    }
    else if (question && parseInt(question.correctOption) != parseInt(response.selectedOption)) {
      response.isAnswerCorrect = 0;
    }
    return response;
  });

  let percentage = (correctAnswers / totalQuestions) * 100;
  percentage = (percentage) ? percentage : 0
  return { percentage, responses }
}

functions.shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

functions.capitalizeEveryInnerWord = (str) => {
  let words = str.split(' ');

  let capitalizedWords = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  let capitalizedStr = capitalizedWords.join(' ');
  return capitalizedStr.trim();
}

functions.generateRanksForLeaderBoard = (body) => {
  const users = body;
  user
  // Sort users based on referralsCount in descending order, and then averagePercentage in descending order
  users.sort((a, b) => {
    if (a.referralsCount !== b.referralsCount) {
      return b.referralsCount - a.referralsCount;
    } else {
      return b.averagePercentage - a.averagePercentage;
    }
  });

  let rank = 1; // Initialize the rank
  let previousRank = 1; // Initialize the previous rank

  for (let i = 0; i < users.length; i++) {
    if (i > 0 && users[i].referralsCount !== users[i - 1].referralsCount) {
      rank = previousRank + 1; // Increment rank only if referralsCount changes
    } else if (i > 0 && users[i].referralsCount === users[i - 1].referralsCount && users[i].averagePercentage !== users[i - 1].averagePercentage) {
      rank = previousRank + 1; // Increment rank if referralsCount and averagePercentage are same
    }
    users[i].rank = rank;
    previousRank = rank; // Update previousRank for next iteration
  }

  return users;
}

functions.generateRanksForAssessmentsLeaderBoard = (body) => {
  const users = body;
  // Sort users based on referralsCount in descending order, and then averagePercentage in descending order
  users.sort((a, b) => {
    if (a.referralsCount !== b.referralsCount) {
      return b.referralsCount - a.referralsCount;
    } else {
      return b.averagePercentage - a.averagePercentage;
    }
  });

  let rank = 1; // Initialize the rank
  let previousRank = 1; // Initialize the previous rank

  for (let i = 0; i < users.length; i++) {
    if (i > 0 && users[i].referralsCount !== users[i - 1].referralsCount) {
      rank = previousRank + 1; // Increment rank only if referralsCount changes
    } else if (i > 0 && users[i].referralsCount === users[i - 1].referralsCount && users[i].averagePercentage !== users[i - 1].averagePercentage) {
      rank = previousRank + 1; // Increment rank if referralsCount and averagePercentage are same
    }
    users[i].rank = rank;
    previousRank = rank; // Update previousRank for next iteration
  }

  return { data: users }
}

functions.generateActivitiesLeaderBoard = (body) => {
  let users = body;
  users = users.filter(user => user.activitiesCount > 0);
  if (users.length) {
    users = users.sort((a, b) => b.activitiesCount - a.activitiesCount);
  }

  let rank = 1;
  let prevActivitiesCount = 0;
  let prevRank = 0;

  users.map((user) => {
    if (user.activitiesCount < prevActivitiesCount) {
      prevRank = prevRank + 1
      rank = prevRank + 1;
    }
    user.rank = rank;
    prevActivitiesCount = user.activitiesCount;
    delete user.averagePercentage;
    delete user.referralsCount;
  });
  return users;
}

functions.generateAssessmentLeaderBoard = (body) => {
  let users = body;
  users = users.filter(user => user.averagePercentage >= 60);
  if (users.length) {
    users = users.sort((a, b) => b.averagePercentage - a.averagePercentage);
  }

  let rank = 1;
  let prevPercentage = 0;
  let prevRank = 0;

  users.forEach((user) => {
    if (user.averagePercentage < prevPercentage) {
      prevRank = prevRank + 1
      rank = prevRank + 1;
    }
    user.rank = rank;
    prevPercentage = user.averagePercentage;
    delete user.activitiesCount;
    delete user.referralsCount;
  });
  return users;
}

functions.generateReferralLeaderBoard = (body) => {
  let users = body;
  users = users.filter(user => user.referralsCount >= 3);
  if (users.length) {
    users = users.sort((a, b) => b.referralsCount - a.referralsCount);
  }


  let rank = 1;
  let prevReferralsCount = 0;
  let prevRank = 0;

  users.forEach((user) => {
    if (user.referralsCount < prevReferralsCount) {
      prevRank = prevRank + 1
      rank = prevRank + 1;
    }
    user.rank = rank;
    prevReferralsCount = user.referralsCount;
    delete user.averagePercentage;
    delete user.activitiesCount;
  });
  return users;
}

functions.applyPagination = (data, limit) => {
  const page = 1;
  const paginatedData = data.slice((page - 1) * limit, page * limit);
  return paginatedData;
}


module.exports = functions
