const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const path = require('path');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const compression = require('compression');
const cors = require('cors');
const app = express();
app.enable('trust proxy');

// setting the view engie as pug
app.set('view engine', 'pug');
// setting the views directory // pug templates are called views in express
app.set('views', path.join(__dirname, 'views'));

//Global Middlewares
// implement cors
app.use(cors())

app.options('*', cors())
// Serving the static files
app.use(express.static(path.join(__dirname, 'public')));
// set Security HTTP headers
app.use(helmet());
// app.use(morgan('dev'));

// rate limiter function to limit the no. of requests per hour from an IP
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000, // after maxing out all the requests next request will be allowed after this time period
    message: 'Too many requests from this IP. Please try again in an hour.'
});
// Using limiter func on all routes '/api'
app.use('/api', limiter);

app.post('/webhook-checkout', express.raw({
    type: 'application/json'
}), bookingController.webhookCheckout)

// Body parser, reads data from the body into req.body
// here { limit : '10kb'} means if the req data is more than 10kb then it won't be accepted
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data Sanitization against NoSql query injection
app.use(mongoSanitize());

// Data Sanitization xss
app.use(xss());

// Prevents parameter pollution
app.use(hpp({
    whitelist: [
        'duration',
        'ratingsAverage',
        'ratingsQuantity',
        'maxGroupSize',
        'price',
        'difficulty'
    ]
}));

app.use(compression());

// Users Route
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handling Unhandled Routes
app.all('*', (req, res, next) => {
    // If a argument is passed to next() function then all the upcoming middlewares in the 
    // middleware stack are skipped and middleware with global error handler is executed
    next(new AppError(`Cannot get anything for ${req.originalUrl} from the server!`, 404));
});

// Handler function with four parameters are automatically deemed to be Global Error Handler by express
app.use(globalErrorHandler);

module.exports = app;