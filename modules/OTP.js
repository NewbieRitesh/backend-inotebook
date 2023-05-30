const mongoose = require('mongoose');
const { Schema } = mongoose;

const OTPSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    otp: {
        type: Number,
        required: true
    },
    otpValidation: {
        type: Boolean
    },
    createdAT: {
        type: Date,
        default: Date.now,
        index: {
            expires: 300
        }
    }
    //Deleted After 5 minutes
}, { timestamps: true });

const OTP = mongoose.model('OTPSchema', OTPSchema);
module.exports = OTP;