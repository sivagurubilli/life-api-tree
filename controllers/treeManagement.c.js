const mongoose = require("mongoose");
let appUtils = require('../utils/appUtils');
let { fetchMaximumSlotsPerLevel, isValidSlotForLevel, generateReferralCode,
    generateSlotNumberWithchildSlotPosition, fetchChildSlotPosition,
    fetchNextAvailableSlotPosition, generateSlotNumber, responseJson,
    isRequestDataValid, generateEachLevelSlotsArray,
    isValidUser } = appUtils
let { BasicLevel, LevelPoints, WalletHistory, User, Role, Otp, EndorsedUsers } = require('../models');
const { isActiveSubscriber } = require("../helpers/user");
const { getCurrentDateAndTime, addDaysToDate } = require("../helpers/dates");

exports.generateUserLevelAndSlots = async (data) => {
    try {
        let {
            referralCode,
            sponsorCode,
            result,
            nextSlot,
            nextSlotData,
            slotPosition,
            userId
        } = data;

        let requiredFields = {
            userId
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        let checkReferral;
        if (sponsorCode) {
            checkReferral = await User.findOne({ referralCode: sponsorCode, isDeleted: false });
            if (!checkReferral) throw Error("Invalid referral.Try another code")
        }
        else if (!sponsorCode) {
            const basicLevelData = await BasicLevel.findOne({});
            if (!basicLevelData) throw Error("Basics level slots not added.")
            checkReferral = await User.findOne({ level: basicLevelData.level, slotNumber: basicLevelData.slot, isDeleted: false });
            if (!checkReferral) throw Error("No user added for basic level and slot")
        }
 

        let parentId = checkReferral._id;
        let body = { parentId: checkReferral._id, sponsorId: checkReferral._id }

        if (!checkReferral.leftChild && !checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "left", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[0], body.referralCode = referralCode;
        else if (checkReferral.leftChild && !checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "middle", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[1], body.referralCode = referralCode;
        else if (checkReferral.leftChild && checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "right", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[2], body.referralCode = referralCode;
        else if (checkReferral.leftChild && checkReferral.middleChild && checkReferral.rightChild) {

            //Fetching the child data
            result = await User.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(checkReferral._id) } },
                {
                    $graphLookup: {
                        from: 'users',
                        startWith: '$_id',
                        connectFromField: '_id',
                        connectToField: 'parentId',
                        as: 'children',
                        maxDepth: 100000,
                        depthField: 'depth'
                    }
                },
                { $unwind: '$children' },
                { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$name' },
                        level: { $first: '$level' },
                        children: { $push: '$children' }
                    }
                }
            ])

            //Extracting the child level next slot and level positions
            nextSlotData = await fetchNextAvailableSlotPosition(result[0].children);
            slotPosition = await fetchChildSlotPosition(nextSlotData[0].missingChilds);
            body.parentId = parentId = nextSlotData[0]._id;
            body.slotPosition = slotPosition;
            let level = parseInt(nextSlotData[0].level) + 1;
            body.level = level;
            body.slotNumber = generateSlotNumberWithchildSlotPosition(nextSlotData[0].slotNumber, slotPosition);
            body.referralCode = referralCode;
        }
        return body;
    }
    catch (e) {
        throw e;
    }
}

exports.generateEndorsedLevelAndSlots = async (data) => {
    try {
        let {
            referralCode,
            sponsorCode,
            parentId,
            result,
            nextSlot,
            nextSlotData,
            slotPosition,
            userId
        } = data;

        let requiredFields = {
            userId
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        const basicLevelData = await BasicLevel.findOne({});
        if (!basicLevelData) throw Error("Basics level slots not added.")

        let checkReferral = await EndorsedUsers.findOne({ _id: parentId });
        let body = { parentId: checkReferral._id, sponsorId: checkReferral._id, sponsorCode: checkReferral.sponsorCode }


        if (!checkReferral.leftChild && !checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "left", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[0], body.referralCode = referralCode;
        else if (checkReferral.leftChild && !checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "middle", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[1], body.referralCode = referralCode;
        else if (checkReferral.leftChild && checkReferral.middleChild && !checkReferral.rightChild) body.slotPosition = "right", body.level = parseInt(checkReferral.level) + 1, body.slotNumber = generateSlotNumber(checkReferral.slotNumber)[2], body.referralCode = referralCode;
        else if (checkReferral.leftChild && checkReferral.middleChild && checkReferral.rightChild) {

            //Fetching the child data
            result = await EndorsedUsers.aggregate([
                { $match: { _id: mongoose.Types.ObjectId(checkReferral._id) } },
                {
                    $graphLookup: {
                        from: 'endorsedusers',
                        startWith: '$_id',
                        connectFromField: '_id',
                        connectToField: 'parentId',
                        as: 'children',
                        maxDepth: 100000,
                        depthField: 'depth'
                    }
                },
                { $unwind: '$children' },
                { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$name' },
                        level: { $first: '$level' },
                        children: { $push: '$children' }
                    }
                }
            ])

            //Extracting the child level next slot and level positions
            nextSlotData = await fetchNextAvailableSlotPosition(result[0].children);
            slotPosition = await fetchChildSlotPosition(nextSlotData[0].missingChilds);
            body.parentId = parentId = nextSlotData[0]._id;
            body.slotPosition = slotPosition;
            let level = parseInt(nextSlotData[0].level) + 1;
            body.level = level;
            body.slotNumber = generateSlotNumberWithchildSlotPosition(nextSlotData[0].slotNumber, slotPosition);
            body.referralCode = referralCode;
        }
        return body;
    }
    catch (e) {
        throw e;
    }
}

exports.allotEndorsedParent = async (body) => {
    try {

        const { userId } = body;
        const currentDate = getCurrentDateAndTime();
        if (!userId) throw { status: 400, message: "UserId is missing in fetching endorsed parents." }

        let data = await User.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$parentId',
                    connectFromField: 'parentId',
                    connectToField: '_id',
                    as: 'parents',
                    maxDepth: 1000,  //to fetch the parent tills 12 levels we have to provide n-1 as depth
                    depthField: 'parentLevel'
                }
            },
            {
                $unwind: "$parents"
            },
            {
                $sort: {
                    "parents.level": -1,
                    "parents.slotNumber": -1
                }
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    referralCode: { $first: "$referralCode" },
                    parentId: { $first: "$parentId" },
                    slotPosition: { $first: "$slotPosition" },
                    level: { $first: "$level" },
                    slotNumber: { $first: "$slotNumber" },
                    parents: { $push: "$parents" }
                }
            },
            {
                $sort: {
                    level: -1,
                    slotNumber: -1
                }
            }
        ]);

        //Data Modifications
        data = JSON.parse(JSON.stringify(data));

        //Checking and Going Modifications
        if (data.length &&
            data[0].parents &&
            data[0].parents.length) {
            data[0].parents.map((x) => {
                x.parentLevel = parseInt(x.parentLevel) + 1;
                return x;
            })
        }
        data = (data[0].parents).filter(record => record.status === 4 && record.referralProgram == 1).sort((a, b) => a.parentLevel - b.parentLevel)[0];
        data = data.endorsedId;
        return data;
    } catch (e) {
        throw e;
    }
}

exports.fetchParentsData = async (body) => {
    try {

        const { userId, pointsType } = body;
        const currentDate = getCurrentDateAndTime();
        if (!userId) throw Error("user Id is missing in fetching parents data")

        let data = await User.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$parentId',
                    connectFromField: 'parentId',
                    connectToField: '_id',
                    as: 'parents',
                    maxDepth: 11,  //to fetch the parent tills 12 levels we have to provide n-1 as depth
                    depthField: 'parentLevel'
                }
            },
            {
                $unwind: "$parents"
            },
            {
                $sort: {
                    "parents.level": -1,
                    "parents.slotNumber": -1
                }
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    referralCode: { $first: "$referralCode" },
                    parentId: { $first: "$parentId" },
                    slotPosition: { $first: "$slotPosition" },
                    level: { $first: "$level" },
                    slotNumber: { $first: "$slotNumber" },
                    parents: { $push: "$parents" }
                }
            },
            {
                $sort: {
                    level: -1,
                    slotNumber: -1
                }
            }
        ]);

        //Data Modifications
        data = JSON.parse(JSON.stringify(data));

        //Checking and Going Modifications
        if (data.length &&
            data[0].parents &&
            data[0].parents.length) {
            data[0].parents.map((x) => {
                x.parentLevel = parseInt(x.parentLevel) + 1;
                return x;
            })
        }

        const levelPoints = await LevelPoints.find({});
        data = (data.length && data[0].parents.length) ? data[0].parents : [];
        let parentsData = [];
        if (data.length && levelPoints.length) {
            data.map((item2) => {
                const matchingItem = levelPoints.find(item1 => item1.level == item2.parentLevel);
                parentsData.push({ userId: item2._id, points: matchingItem ? matchingItem.points : 0, joinerId: userId, transactionType: 'credit', depositType: 'chainlevelpoints', pointsType, createdAt: currentDate, updatedAt: currentDate });
            });
        }
        return parentsData;
    } catch (e) {
        throw e;
    }
}


exports.fetchEndorsedParentsData = async (body) => {
    try {

        const { userId, pointsType, endorsedUserId } = body;
        const currentDate = getCurrentDateAndTime();
        if (!userId) throw Error("user Id is missing in fetching parents data")

        let data = await EndorsedUsers.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(endorsedUserId) } },
            {
                $graphLookup: {
                    from: 'endorsedusers',
                    startWith: '$parentId',
                    connectFromField: 'parentId',
                    connectToField: '_id',
                    as: 'parents',
                    maxDepth: 11,  //to fetch the parent tills 12 levels we have to provide n-1 as depth
                    depthField: 'parentLevel'
                }
            },
            {
                $unwind: "$parents"
            },
            {
                $sort: {
                    "parents.level": -1,
                    "parents.slotNumber": -1
                }
            },
            {
                $group: {
                    _id: "$_id",
                    referralCode: { $first: "$referralCode" },
                    parentId: { $first: "$parentId" },
                    slotPosition: { $first: "$slotPosition" },
                    level: { $first: "$level" },
                    slotNumber: { $first: "$slotNumber" },
                    parents: { $push: "$parents" }
                }
            },
            {
                $sort: {
                    level: -1,
                    slotNumber: -1
                }
            }
        ]);

        //Data Modifications
        data = JSON.parse(JSON.stringify(data));

        //Checking and Going Modifications
        if (data.length &&
            data[0].parents &&
            data[0].parents.length) {
            data[0].parents.map((x) => {
                x.parentLevel = parseInt(x.parentLevel) + 1;
                return x;
            })
        }
        const levelPoints = await LevelPoints.find({});
        data = (data.length && data[0].parents.length) ? data[0].parents : [];
        let parentsData = [];
        if (data.length && levelPoints.length) {
            data.map((item2) => {
                const matchingItem = levelPoints.find(item1 => item1.level == item2.parentLevel);
                parentsData.push({ userId: item2.userId, points: matchingItem ? matchingItem.points : 0, joinerId: userId, transactionType: 'credit', depositType: 'chainlevelpoints', pointsType, createdAt: currentDate, updatedAt: currentDate });
            });
        }
        return parentsData;
    } catch (e) {
        throw e;
    }
}

exports.fetchUserWalletData = async (body) => {
    try {

        const { userId, status } = body;
        //If current subscription is expired
        if (status != 4) {
            return { totalEarnedPoints: 0, totalRedeemedPoints: 0, totalAvailablePoints: 0 }
        }

        //If current subscription is not-expired
        else if (status == 4) {
            const result = await WalletHistory.aggregate([
                {
                    $match: {
                        userId: mongoose.Types.ObjectId(userId),
                        pointsType: 1,
                        $or: [
                            { transactionType: 'credit' }, // Include all credit transactions
                            {
                                $and: [
                                    { transactionType: 'debit' },
                                    { withdrawlStatus: { $in: ['requestRaised', 'completed'] } } // Include specific debit transactions
                                ]
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$transactionType',
                        totalPoints: { $sum: '$points' }
                    }
                }
            ]);

            const pointsSummary = {
                credit: 0,
                debit: 0
            };

            result.forEach(entry => {
                pointsSummary[entry._id] = entry.totalPoints;
            });

            const totalEarnedPoints = (pointsSummary.credit) ? pointsSummary.credit : 0;
            const totalRedeemedPoints = (pointsSummary.debit) ? pointsSummary.debit : 0;
            const totalAvailablePoints = (totalEarnedPoints) - (totalRedeemedPoints);

            return { totalEarnedPoints, totalRedeemedPoints, totalAvailablePoints };
        }
    }
    catch (e) {
        throw e
    }
}

exports.addBasicLevelAndSlot = async (req, res) => {
    try {
        let {
            level, slot
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            level, slot
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        const isValidSlotPerLevel = isValidSlotForLevel({ level, slot });
        if (!isValidSlotPerLevel) throw Error(`Maximum available slots for this level is ${fetchMaximumSlotsPerLevel(level)}`)

        let totalBasicsData = await BasicLevel.find({});
        if (totalBasicsData.length) throw Error("Already basic level added. Please edit the current one")

        let checkLevelUser = await User.findOne({ level, slotNumber: slot, isDeleted: false })
        if (!checkLevelUser) throw Error("No user found for provided level and slot")

        let data = await BasicLevel.create({ level, slot });
        if (!data) throw Error("Unable to create .Try again")

        res.send(responseJson(1, data, 'Basic Level and Slot created successfully'))
    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Basic Level and Slot creation failed', e))
    }
}

exports.fetchBasicLevelAndSlot = async (req, res) => {

    try {
        let {
            level, slot
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {

        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        let dbQuery = {};
        if (slot) dbQuery.slot = slot;
        if (level) dbQuery.level = level;

        let data = await BasicLevel.findOne(dbQuery);
        if (!data) throw Error("No basic level and slot.Please add one")
        res.send(responseJson(1, data, 'Basic Level and Slot fetching successfully'))
    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Basic Level and Slot fetching failed', e))
    }
}

exports.editBasicLevelAndSlot = async (req, res) => {
    try {
        let {
            level, slot, id
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            level, slot, id
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        const isValidSlotPerLevel = isValidSlotForLevel({ level, slot });
        if (!isValidSlotPerLevel) throw Error(`Maximum available slots for this level is ${fetchMaximumSlotsPerLevel(level)}`)

        let checkLevelUser = await User.findOne({ level, slotNumber: slot, isDeleted: false })
        if (!checkLevelUser) throw Error("No user found for provided level and slot")

        let data = await BasicLevel.findOneAndUpdate({ _id: id }, { $set: { level, slot } }, { new: true });
        if (!data) throw Error("Invalid id or unable to edit.Try again")

        res.send(responseJson(1, data, 'Basic Level and Slot edit successfully'))
    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Basic Level and Slot edit failed', e))
    }
}


//Fetching Users Referral and groupsData
exports.fetchMyReferralData = async (req, res, next) => {
    try {

        let userId = req.user._id;
        let checkUser = req.user;
        //Fetching Childs from given userId tree
        let data = await User.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parentId',
                    as: 'children',
                    maxDepth: 11,                //to fetch the child tills 12 levels we have to provide n-1 as depth
                    depthField: 'childLevel',
                    restrictSearchWithMatch: { "isDeleted": false }
                }
            },
            { $unwind: '$children' },
            { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    level: { $first: '$level' },
                    children: { $push: '$children' }
                }
            }
        ])

        data = JSON.parse(JSON.stringify(data));
        if (data.length &&
            data[0].children &&
            data[0].children.length) {
            data[0].children.map((x) => {
                x.childLevel = parseInt(x.childLevel) + 1;
                return x;
            })
        }

        data = (data.length && data[0].children.length) ? data[0].children : [];
        const totalDirectReferralsCount = await User.find({ sponsorCode: checkUser.referralCode, isDeleted: false, isDirectReferral: true }).countDocuments();
        const totalGroupCount = data.length;

        //Generating the 12 levels and its slots
        let initialSlotsPerLevelData = generateEachLevelSlotsArray(12);
        if (!initialSlotsPerLevelData.length) throw Error("Initial slots are not generated.Try again")

        //Grouping the and adding child count based on each level
        const childLevelsData = initialSlotsPerLevelData.map(aObj => {
            const childsCount = data.reduce((accumulator, bObj) => {
                if (bObj.childLevel == aObj.level) {
                    return accumulator + 1;
                }
                return accumulator;
            }, 0);

            return { ...aObj, childsCount };
        });

        res.status(200).send({ status: 1, message: "Referrals list fetched successfully!", data: { totalDirectReferralsCount, totalGroupCount, childLevelsData } })
    }
    catch (error) {
        next(error)
    }
}

exports.fetchUserGroupsData = async (body) => {
    try {

        let { userId, modelName, collectionName } = body;
        collectionName = (modelName != "endorsedusers") ? User : EndorsedUsers;

        let requiredFields = {
            userId: userId.trim()
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);


        //Fetching Childs from given userId tree
        let data = await collectionName.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: modelName,
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parentId',
                    as: 'children',
                    maxDepth: 11,                //to fetch the child tills 12 levels we have to provide n-1 as depth
                    depthField: 'childLevel',
                    restrictSearchWithMatch: { "isDeleted": false }
                }
            },
            { $unwind: '$children' },
            { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
            {
                $group: {
                    _id: '$_id',
                    level: { $first: '$level' },
                    children: { $push: '$children' }
                }
            }
        ])

        data = JSON.parse(JSON.stringify(data));
        if (data.length &&
            data[0].children &&
            data[0].children.length) {
            data[0].children.map((x) => {
                x.childLevel = parseInt(x.childLevel) + 1;
                return x;
            })
        }

        data = (data.length && data[0].children.length) ? data[0].children : [];
        const totalGroupCount = data.length;

        //Generating the 12 levels and its slots
        let initialSlotsPerLevelData = generateEachLevelSlotsArray(12);
        if (!initialSlotsPerLevelData.length) throw Error("Initial slots are not generated.Try again")

        //Grouping the and adding child count based on each level
        const childLevelsData = initialSlotsPerLevelData.map(aObj => {
            const childsCount = data.reduce((accumulator, bObj) => {
                if (bObj.childLevel == aObj.level) {
                    return accumulator + 1;
                }
                return accumulator;
            }, 0);

            return { ...aObj, childsCount };
        });

        return { childLevelsData, totalGroupCount }
    }
    catch (e) {
        throw e
    }
}


exports.fetchUserGroupStatsData = async (body) => {
    try {

        let { userId, modelName, collectionName } = body;
        collectionName = (modelName != "endorsedusers") ? User : EndorsedUsers;

        let requiredFields = {
            userId: userId.trim()
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);


        //Fetching Childs from given userId tree
        let data = await collectionName.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(userId) } },
            {
                $graphLookup: {
                    from: modelName,
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parentId',
                    as: 'children',
                    maxDepth: 11,                //to fetch the child tills 12 levels we have to provide n-1 as depth
                    depthField: 'childLevel',
                    restrictSearchWithMatch: { "isDeleted": false }
                }
            },
            { $unwind: '$children' },
            { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
            {
                $group: {
                    _id: '$_id',
                    level: { $first: '$level' },
                    children: { $push: '$children' }
                }
            }
        ])

        data = JSON.parse(JSON.stringify(data));
        let usersData = [];
        if (data.length &&
            data[0].children &&
            data[0].children.length) {
            data[0].children.map((x) => {
                x.childLevel = parseInt(x.childLevel) + 1;
                usersData.push({ _id: x._id, name: x.name, email: x.email, mobileNo: x.mobileNo, status: x.status, profileImageUrl: x.profileImageUrl, createdAt: x.createdAt })
                return x;
            })
        }
        const totalGroupCount = usersData.length;
        return { usersData, totalGroupCount }
    }
    catch (e) {
        throw e
    }
}


exports.fetchMyDirectReferrals = async (req, res) => {

    try {

        let {
            userId,
            limit,
            page,
            skip
        } = Object.assign(req.body, req.query, req.params)

        let requiredFields = {
            userId: userId.trim()
        }
        let requestDataValid = isRequestDataValid(requiredFields, '1234')
        if (requestDataValid !== true) throw Error(requestDataValid);

        limit = limit ? parseInt(limit) : 100
        page = page ? parseInt(page) : 1
        skip = parseInt(limit) * parseInt(page - 1)

        const userData = await isValidUser(userId);
        const data = await User.find({ sponsorCode: userData.referralCode, isDirectReferral: true, userType: { $in: ['expired', 'paid'] } }).select('name referralCode').limit(limit).skip(skip);

        res.status(200).send(responseJson(1, data, 'Fetching referrals success', {}, data.length))
    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Fetching referrals  Failed', e))

    }
}

exports.fetchDefaultReferralCode = async (req, res) => {
    try {

        const basicLevelData = await BasicLevel.findOne({});
        let data = await User.findOne({ level: basicLevelData.level, slotNumber: basicLevelData.slot, isDeleted: false }).select('referralCode name level slotNumber')
        if (!data) throw Error("No default referral found")

        res.status(200).send(responseJson(1, data, 'Fetching referral code success'))
    }
    catch (e) {
        res.status(e.statusCode || 500).send(responseJson(0, [], e.msg || 'Fetching referral code failed', e))
    }
}


exports.fetchMyEndorsedReferralData = async (req, res, next) => {
    try {

        let userId = req.user._id;
        let checkUser = req.user;
        //Fetching Childs from given userId tree
        let data = await EndorsedUsers.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(checkUser.endorsedId) } },
            {
                $graphLookup: {
                    from: 'endorsedusers',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'parentId',
                    as: 'children',
                    maxDepth: 11,                //to fetch the child tills 12 levels we have to provide n-1 as depth
                    depthField: 'childLevel',
                    restrictSearchWithMatch: { "isDeleted": false }
                }
            },
            { $unwind: '$children' },
            { $sort: { 'children.level': 1, 'children.slotNumber': 1 } },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    level: { $first: '$level' },
                    children: { $push: '$children' }
                }
            }
        ])

        data = JSON.parse(JSON.stringify(data));
        if (data.length &&
            data[0].children &&
            data[0].children.length) {
            data[0].children.map((x) => {
                x.childLevel = parseInt(x.childLevel) + 1;
                return x;
            })
        }

        data = (data.length && data[0].children.length) ? data[0].children : [];
        const totalDirectReferralsCount = await EndorsedUsers.find({ sponsorCode: checkUser.referralCode, isDeleted: false, isDirectReferral: true }).countDocuments();
        const totalGroupCount = data.length;

        //Generating the 12 levels and its slots
        let initialSlotsPerLevelData = generateEachLevelSlotsArray(12);
        if (!initialSlotsPerLevelData.length) throw Error("Initial slots are not generated.Try again")

        //Grouping the and adding child count based on each level
        const childLevelsData = initialSlotsPerLevelData.map(aObj => {
            const childsCount = data.reduce((accumulator, bObj) => {
                if (bObj.childLevel == aObj.level) {
                    return accumulator + 1;
                }
                return accumulator;
            }, 0);

            return { ...aObj, childsCount };
        });

        res.status(200).send({ status: 1, message: "Referrals list fetched successfully!", data: { totalDirectReferralsCount, totalGroupCount, childLevelsData } })
    }
    catch (error) {
        next(error)
    }
}
