const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        trim: true,
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Password length should be greater than or equal to 8'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm the password'],
        // This function will only work while SAVE or CREATE not update
        validate: {
            validator: function (el) {
                return this.password === el;
            }
        },
        message: 'Passwords are not the same'
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

userSchema.pre('save', async function (next) {
    // Checking if the password is modified or not
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    // setting passwordConfirm so that it does not get persisted in the DB
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next();
});

// userSchema.methods. makes a function available to us in the document created by the userSchema
userSchema.methods.correctPassword = function (candidatePassword, userPassword) {
    return bcrypt.compare(candidatePassword, userPassword);
};

// Previous state with async-await
// userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
//     return await bcrypt.compare(candidatePassword, userPassword)
// }

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimeStamp < changedTimeStamp;
    }
    // False means password was not changed
    return false;
};

userSchema.methods.createResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};


const User = mongoose.model('User', userSchema);

module.exports = User;