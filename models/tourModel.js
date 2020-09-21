const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name.'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must be less than or equal to 40 characters'],
        minlength: [10, 'A tour name must be more than or equal to 10 characters']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A tour must have duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'The difficulty can be one of easy, medium, difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating should be greater than or equal to 1.0'],
        max: [5, 'Rating should be less than or equal to 5.0'],
        set: val => Math.round(val * 10) / 10 // runs everytime a new value is set
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        // We can also write below validator as 
        // validate : [function , 'msg']
        validate: {
            validator: function (val) {
                // val is the value of the field i.e. priceDiscount
                return val < this.price;
            },
            // in 'message' we have access to current value of current field i.e. priceDiscount
            // we can access using only  this syntax => {VALUE}
            message: 'Discount price ({VALUE}) should be less than regular price'
        }
    },
    summary: {
        type: String,
        required: [true, 'A tour must have summary'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false // this will hide 'createdAt' from the response
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // geoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [{
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
    }],
    guides: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }]
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// Indexing for better reading of the docs. 1 = asc -1 = desc
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

// Virtual populate
//Foreign and local field should match
tourSchema.virtual('reviews', {
    ref: 'Review', // Which model to query
    foreignField: 'tour', // name of the field in the ref schema on the basis of which
    // the population will take place
    localField: '_id' // name of the field in the current schema on the basis of which
    // the population will take place
});

// Document middleware, this middleware will be triggered whenever we save or create a document 
// (But not when we perform insertMany)
tourSchema.pre('save', function (next) {
    // adding property to current document object
    this.slug = slugify(this.name, { lower: true });
    next();
});

// For embedding the user guides document into tours
// tourSchema.pre('save', async function (next) {
//     // Here async function returns promise 
//     const guidesPromises = this.guides.map(async id => await User.findById(id))
//     this.guides = await Promise.all(guidesPromises);
//     next()
// })

// In post we have access to saved document and next
// tourSchema.post('save', function (doc,next) {
//     console.log(this, 'divider\n\n', doc)
//     // the doc and this are the same document
//     console.log(this == doc)
//     next();
// });

// Query Document
// In this we have used regular exp. because we want to trigger this middleware
// for every query that starts with 'find' like find, findOne, findById, etc
tourSchema.pre(/^find/, function (next) {
    // Here 'this' refers to query 
    // Here we are filtering the query to remove secret tours from result
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides', // this populate all the IDs in guides field
        select: '-__v -passwordChangedAt'
    });

    next();
});

// tourSchema.post(/^find/, function (docs, next) {
//     // here docs refer to all the documents returned after query
//     // Here 'this' refers to query 
//     // Here we are filtering the query to remove secret tours from result
//     console.log('Time took', Date.now() - this.start);

//     next();
// });

// Aggregation Middleware
// tourSchema.pre('aggregate', function (next) {
//     // here this refers to aggregation object
//     // WE are filtering ou secret tour by inserting $match object to aggregate pipeline
//     // aggregate is an array hence unshift
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     console.log('pl', this.pipeline())

//     next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;