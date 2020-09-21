const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review can not be empty']
    },
    rating: {
        type: Number,
        default: 4.5,
        min: [1.0, 'Rating can not be less than 1.0'],
        max: [5.0, 'Rating can not be greater than 5.0']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour.']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user']
    }
});

// Document Middleware
reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // });
    this.populate({
        path: 'user',
        select: 'name photo'
    });
    next();
});

// this prevents multiple reviews by same user on same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// The static functions are available on the Model (Here Review Model)
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // In static functions 'this' represents Model (Here Review Model)
    const stats = await this.aggregate([
        {
            // Selecting all reviews with id of tourId
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    }
    else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }

};

reviewSchema.post('save', function (doc, next) {
    // here this represents saved document
    // NOTE: the above function (calcAverageRatings) is a static function
    // as we discussed above static functions are only available on the Model
    // but here we have not defined Model (Review) as yet
    // so to access Model with the document we can do:
    this.constructor.calcAverageRatings(this.tour);
    // constructor means Model which constructed current doc(this)
    // this represents review doc and this.tour means tour id 
    next();
});

// ****************************IMPORTANT NOTE**************************************
// calcAverageRatings funtion is only available on Model and we can access Model before 
// defining a Model with the help of documents, but we do not have document Middleware for
// update and delete. So to work around this limitation we have used some tricks    

reviewSchema.pre(/^findOneAnd/, async function (next) {
    // here this means query but we need doc so we have
    // executed the query. and we need tourId as argument for calcAverageRatings
    // which resides in review doc and we are passing this review doc from 
    // pre hooks to post hook using line below
    this.r = await this.findOne();
    // now this.r means review doc
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    // as this.r means doc hence we can access Model with 
    // the help of constructor and this.r.tour is tourId
    this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);


module.exports = Review;