const { promisify } = require('util');
const User = require('../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const crypto = require('crypto');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,// browser cannot modify cookie
        secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
    };
    // Cookie will only work on HTTPS and not on HTTP

    res.cookie('jwt', token, cookieOptions);
    // this will not show password field in the response
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    });
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();
    createSendToken(newUser, 201,req, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    // here we have used .select('+password') because by default password is not selected
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Invalid email or password', 401));
    }

    createSendToken(user, 200,req, res);
});

exports.logout = (req, res, next) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({
        status: 'success'
    });
};

exports.protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    // Check if the token exists
    if (!token) {
        return next(new AppError('You are not logged in! Please login to get access', 401));
    }

    // Verification of the token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // Check if the user is not deleted after the token is issued
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The token belonging to the user no longer exists', 401));
    }

    // Check if the password is not changed after the token is issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password! Please login again', 401));
    }

    // Grant access
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

// Only for rendered pages, throws no errors
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // Verification of the token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
            // Check if the user is not deleted after the token is issued
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            // Check if the password is not changed after the token is issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            //There is a logged in user
            // variables available in the pug templates are called 'locals', hence now
            // 'user' will be available in pug template (similar to passing variables in render function)
            res.locals.user = currentUser;
            return next();
        }
        catch (err) {
            return next();
        }
    }
    next();
};

// Here ...roles will put all the arguments passed to function in an array
// eg: we have passed restrictTo('admin', 'guide', 'user') => roles-> ['admin', 'guide', 'user']
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }

        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('No user found with that email', 404));
    }
    const resetToken = user.createResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            message: 'Reset password email sent.'
        });
    }
    // here we have used try catch because we want to reset passwordResetToken passwordResetExpires
    catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was some error. Please try again later.', 500));
    }


});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError('Token is invalid or it has been expired.', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Here we have not turned off validateBeforeSave because we want to check password == passwordConfirm
    await user.save();

    // log the user in, generate new jwt token
    createSendToken(user, 201,req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // if (!req.body.passwordCurrent || !req.body.password) {
    //     return next(new AppError('Please enter the old and new passwords', 400));
    // }
    // 1) get user from the collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) check the old password
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is incorrect', 401));
    }

    // 3) update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) log the user in, generate the new jwt token
    createSendToken(user, 200,req, res);
});