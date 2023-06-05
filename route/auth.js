const express = require('express');
const User = require('../modules/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');
const nodemailer = require('nodemailer');
const OTP = require('../modules/OTP');

const JWT_Token = process.env.JWT_TOKEN

// Route 1: to create user
router.post('/createuser', [
  body('name', 'Enter name with minimum 3 characters').isLength({ min: 3 }),
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'password should contain at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    // if validation occur error then send bad request
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array()[0].msg });

    // check user with entered email is exists or not, if user exists then send bad request 
    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).json({ success: false, response: "sorry this email is already regestered" })

    // creating a user
    // encrypting password to store
    const salt = await bcrypt.genSalt(10)
    const securePassword = await bcrypt.hashSync(req.body.password, salt)
    // creating and storing the data in database
    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: securePassword,
      lastPasswordChange: Date(),
    })

    // generating JWT Token and sending authtoken as response
    data = { user: { id: user.id } }
    const authToken = jwt.sign(data, JWT_Token)
    res.status(200).json({ success: true, response: "account created successfully", authToken })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, response: "Internal Server Error" })
  }
})

// Route 2: to login 
router.post('/login', [
  body('email', 'Enter a valid Email').isEmail(),
  body('password', 'password should contain at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    // if validation occur error then send bad request
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array()[0].msg });

    // check the user with email exists or not, if user don't exists then send bad request
    const { email, password } = req.body;
    let user = await User.findOne({ email: email });
    if (!user) return res.status(400).json({ success: false, response: "Enter valid credentials" })

    // if entered password does not match then send bad request
    const passwordCompare = await bcrypt.compare(password, user.password)
    if (!passwordCompare) return res.status(400).json({ success: false, response: "Enter valid credentials" })

    // generating JWT token and sending as response
    const data = { user: { id: user.id } }
    const authToken = jwt.sign(data, JWT_Token)
    res.json({ success: true, response: "login successful", authToken })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, response: "some error occured" })
  }
})

// Route 3: to get loged in user data
router.post('/getuser', fetchuser, async (req, res) => {
  try {
    // getting user data from database and sending as response
    const user = await User.findById(req.user.id).select('-password');
    // if user not exists then send bad request
    if (!user) return res.status(400).json({ success: false, response: "User is not valid" })
    // else send the user
    res.status(200).json({ success: true, user })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, response: "some error occured" })
  }
})

// Route 4: to update user data except credentials 
router.put('/update-user-data/:id', fetchuser, [
  body('name', 'Name should be minimum 3 characters').isLength({ min: 3 })
], async (req, res) => {
  try {
    // if validation errors then send bad request with errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array()[0].msg });

    // declaraing variables
    const { name } = req.body;
    const userId = req.params.id;

    // if user not exists then send bad request
    let user = await User.findById(userId).select("-password")
    if (!user) return res.status(404).json({ success: false, response: "User doesn't exists" })

    // if user exists then update user data (name) and send response
    user = await User.findByIdAndUpdate(userId, { $set: { name } }, { new: true })
    res.status(200).json({ success: true, response: "User data updated successfully", name })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, response: "some error occured" })
  }
})

// Route: 5 to authenticate user to update credentials
router.post('/authenticate/:id', fetchuser, [
  body('password', 'Enter a valid Password').isLength({ min: 6 })
], async (req, res) => {
  try {
    // if errors then send bad request
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array()[0].msg });

    // if user not exists then send bad request
    const user = await User.findById(req.params.id)
    if (!user) return res.status(400).json({ success: false, response: "Enter valid credentials" })

    // if password match then send response else send bad request
    const comparePasswords = await bcrypt.compare(req.body.password, user.password)
    if (comparePasswords) res.json({ success: true, response: "Authenticated Successfully", comparePasswords })
    else return res.status(400).json({ success: false, response: "Wrong Password" })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route: 6 update user email
router.put('/update-user-email/:id', fetchuser, [
  body('email', 'enter a valid email').isEmail(),
  body('authPassword', 'password should contain at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    // if validation occur error then send bad request
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array()[0].msg });

    // distructuring variables 
    const { email, authPassword } = req.body
    const userId = req.params.id;

    // if user not exist then send bad request
    let user = await User.findById(userId)
    if (!user) return res.status(400).json({ success: false, response: "Enter valid credentials" })
    // if user exists then compare password
    if (user) {
      // if true then update email and send response else send bad request
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      if (comparePasswords === true) {
        let userNewEmail = await User.findOne({ email: email });
        if (userNewEmail) return res.status(400).json({ success: false, response: "sorry this email is already regestered" })
        user = await User.findByIdAndUpdate(userId, { $set: { email } }, { new: true })
        res.status(200).json({ success: true, response: "Email updated successfully", email })
      } else res.status(400).json({ success: false, response: "invalid password" })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, response: "some error occured" })
  }
})

// Route: 7 update user password
router.put('/update-user-password/:id', fetchuser, [
  body('newPassword', 'password should contain at least 6 characters').isLength({ min: 6 }),
  body('authPassword', 'password should contain at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    // if validation occur error then send bad request
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array()[0].msg });

    // destructuing variables
    const { newPassword, authPassword } = req.body
    const userId = req.params.id;

    // if user not exist then send bad request
    let user = await User.findById(userId)
    if (!user) return res.status(400).json({ success: false, response: "user not exists" })
    // if exists then compare password 
    if (user) {
      // if password match then update password with new hash and send response
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      if (comparePasswords === true) {
        if (authPassword !== newPassword) {
          const salt = await bcrypt.genSalt(10)
          const newHashPassword = await bcrypt.hash(newPassword, salt)
          user = await User.findByIdAndUpdate(userId, { $set: { password: newHashPassword, lastPasswordChange: Date() } }, { new: true })
          res.status(200).json({ success: true, response: "password changed successfully" })
        } else res.json({ success: false, response: "Password cann't same as previous password" })
      } else res.status(400).json({ success: false, response: "invalid password" })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route 8: to delete user
router.delete('/delete-user/:id', fetchuser, [
  body('password', 'Enter a valid Password').isLength({ min: 6 })
], async (req, res) => {
  try {
    // if user not exist then send bad request
    const userId = req.params.id
    const user = await User.findById(userId)
    if (!user) return res.status(400).json({ success: false, response: "user not exists" })

    // if user exists then compare password
    if (user) {
      // if password match then delete user and send response
      const comparePasswords = await bcrypt.compare(req.body.authPassword, user.password)
      if (comparePasswords === true) {
        const deletedUser = await User.findByIdAndDelete(userId)
        res.status(200).json({ success: true, response: "User deleted successfully", deletedUser })
      } else res.status(400).json({ success: false, error: "invalid password" })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route 9: to forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // if user not exist then send bad request
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, response: "User not found" })

    // generating otp
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }

    // creating nodemailer transporter object
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
      }
    })

    // configure email message
    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "iNotebook password reset otp",
      text: `this mail is from iNotebook web app \n you can reset your password using given otp \n OTP: ${otp}`
    }

    // send email
    let data = await transporter.sendMail(mailOptions);
    // store email and otp to database
    if (!data) return res.status(500).json({ success: false, error: "some error occured" })
    let otpDB = await OTP.findOne({ email })
    if (otpDB) otpDB = await OTP.findByIdAndDelete(otpDB._id)
    otpDB = await OTP.create({
      email,
      otp
    })
    res.json({ success: true, response: "OTP has been sent to your email" })
  } catch (error) {
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route 10: to verify otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, userOTP } = req.body;
    const user = await User.findOne({ email })
    let dbOTP = await OTP.findOne({ email })

    // if user and otp not found then send bad request
    if (!user) return res.status(404).json({ success: false, response: "User not found" })
    if (!dbOTP) return res.status(404).json({ success: false, response: "Session Expired" })

    if (dbOTP.otp === parseInt(userOTP)) {
      return res.json({ success: true, response: "OTP Verified" })
    } else return res.json({ success: false, response: "wrong otp" })

  } catch (error) {
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route 11: to update password by otp
router.put('/forgot-update-password', async (req, res) => {
  try {
    const { userOTP, newPassword, email } = req.body;
    const dbOTP = await OTP.findOne({ email });
    let user = await User.findOne({ email });
    console.log(req.body);
    // if user and otp not found
    if (!user) return res.status(400).json({ success: false, response: "User not found" })
    if (!dbOTP) return res.status(400).json({ success: false, response: "Session Expired" })

    console.log(dbOTP);
    console.log(user);
    if (dbOTP.otp === parseInt(userOTP) && user.email === dbOTP.email) {
      const myPlainPassword = newPassword;
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(myPlainPassword, salt);
      user = await User.findOneAndUpdate(user._id, { $set: { password: newHashPassword, lastPasswordChange: Date() } }, { new: true })
      await OTP.findOneAndDelete({ email })
      return res.status(200).json({ success: true, response: "Password updated Successfully" })
    } else return res.status(400).json({ success: false, response: "some error occured" })

  } catch (error) {
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

module.exports = router;