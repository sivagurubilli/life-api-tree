
exports.validateReferralProgramAccess = (req, res, next) => {
    try {
        const user = req.user;
        const status = req.user.status;
        if (status != 4) throw { status: 403, message: "Access denied. Please subscribe referral programs to access this feature." }
        next();
    }
    catch (error) {
        next(error)
    }
}