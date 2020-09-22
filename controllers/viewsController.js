const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const Booking = require('./../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
    const tours = await Tour.find();

    res.status(200).render('overview', {
        title: 'All tours',
        tours
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        select: 'review user rating'
    });

    if (!tour) {
        return next(new AppError('There is no tour with that name.', 404));
    }

    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour
    });
});

exports.getLoginForm = (req, res) => {

    res.status(200).render('login', {
        title: 'Log into your account'
    });
};

exports.getSignupForm = (req, res) => {

    res.status(200).render('signup', {
        title: 'Create your account!'
    });
};

exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'your account'
    });
};

exports.updateUserData = catchAsync(async (req, res) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    }, {
        new: true,
        runValidators: true
    });
    res.status(200).render('account', {
        title: 'your account',
        user: updatedUser
    });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find({ user: req.user.id });

    // const tourIDs = bookings.map(el => el.tour);
    const tourIDs = bookings.map(el => el.tour);
    const tours = await Tour.find({ _id: { $in: tourIDs } });

    res.status(200).render('overview', {
        title: 'My tours',
        tours
    });
});