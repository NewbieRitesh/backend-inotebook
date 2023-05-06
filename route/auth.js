const express = require('express');
const User = require('../modules/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');

const JWT_Token = 'King';


// Route 1: to create user
router.post('/createuser', [
  body('name', 'Enter name with minimum 3 characters').isLength({ min: 3 }),
  body('email', 'Enter a valid email').isEmail(),
  body('password', 'password should contain at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    // for validation errors
    const errors = validationResult(req);
    // if validation occur error then send bad request
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array() });

    // check user with entered email is exists or not
    let user = await User.findOne({ email: req.body.email });
    // if user exists then send bad request 
    if (user) return res.status(400).json({ success: false, response: "sorry this email is already regestered" })

    // creating a user
    // encrypting password to store
    const salt = await bcrypt.genSalt(10)
    const securePassword = await bcrypt.hashSync(req.body.password, salt)
    // creating and storing the data in database
    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: securePassword
    })

    // generating JWT Token and sending authtoken as response
    data = { user: { id: user.id } }
    const authToken = jwt.sign(data, JWT_Token)
    res.status(200).json({ success: true, authToken })
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
    // for validation errors
    const errors = validationResult(req);
    // if validation occur error then send bad request
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array });

    // check the user with email exists or not
    const { email, password } = req.body;
    let user = await User.findOne({ email: email });
    // if user don't exists then send bad request
    if (!user) return res.status(400).json({ success: false, response: "Enter valid credentials" })

    // comparing password
    const passwordCompare = await bcrypt.compare(password, user.password)
    // if entered password does not match then send bad request
    if (!passwordCompare) return res.status(400).json({ success: false, response: "Enter valid credentials" })

    // generating JWT token and sending as response
    const data = { user: { id: user.id } }
    const authToken = jwt.sign(data, JWT_Token)
    res.json({ success: true, authToken })
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
router.put('/update-user-data/:id', fetchuser, body('name', 'Name should be minimum 3 characters').isLength({ min: 3 }), async (req, res) => {
  try {
    // for validation errors
    const errors = validationResult(req);
    // if validation errors then send bad request with errors
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array() });

    // declaraing variables
    const { name } = req.body;
    const userId = req.params.id;

    // checking user exists or not 
    let user = await User.findById(userId).select("-password")
    // if user not exists then send bad request
    if (!user) return res.status(404).json({ success: false, response: "User doesn't exists" })

    // if user exists then update user data (name) and send response
    user = await User.findByIdAndUpdate(userId, { $set: { name } }, { new: true })
    res.status(200).json({ status: true, response: "User data updated successfully", name })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, response: "some error occured" })
  }
})

// Route: 5 to authenticate user to update credentials
router.post('/authenticate/:id', fetchuser, [
  body('password', 'Enter a valid Password').isLength({ min: 6 }),

], async (req, res) => {
  try {
    // for validation errors
    const errors = validationResult(req);
    // if errors then send bad request
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array() });

    // checking user exists or not
    const user = await User.findById(req.params.id)
    // if user not exists then send bad request
    if (!user) return res.status(400).json({ success: false, response: "Enter valid credentials" })

    // comparing passwords
    const comparePasswords = await bcrypt.compare(req.body.password, user.password)
    // if password match then send response else send bad request
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
    // for validation errors
    const errors = validationResult(req);
    // if validation occur error then send bad request
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array });

    // distructuring variables 
    const { email, authPassword } = req.body
    const userId = req.params.id;

    // finding user exists or not
    let user = await User.findById(userId)
    // if user not exist then send bad request
    if (!user) return res.status(400).json({ success: false, response: "Enter valid credentials" })
    // if user exists then compare password
    if (user) {
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      // if true then update email and send response else send bad request
      if (comparePasswords === true) {
        user = await User.findByIdAndUpdate(userId, { $set: { email } }, { new: true })
        console.log("new user obj", user)
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
    // for validation errors
    const errors = validationResult(req);
    // if validation occur error then send bad request
    if (!errors.isEmpty()) return res.status(400).json({ success: false, response: errors.array });

    // destructuing variables
    const { newPassword, authPassword } = req.body
    const userId = req.params.id;

    // checking user exist or not
    let user = await User.findById(userId)
    // if user not exist then send bad request
    if (!user) return res.status(400).json({ success: false, response: "user not exists" })
    // if exists then compare password 
    if (user) {
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      // if password match then update password with new hash and send response
      if (comparePasswords === true) {
        const salt = await bcrypt.genSalt(10)
        const newHashPassword = await bcrypt.hash(newPassword, salt)
        user = await User.findByIdAndUpdate(userId, { $set: { password: newHashPassword } }, { new: true })
        res.status(200).json({ success: true, response: "password changed successfully" })
      } else res.status(400).json({ success: false, response: "invalid password" })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route 8: to delete user
router.delete('/delete-user/:id', fetchuser, async (req, res) => {
  try {
    const userId = req.params.id
    // checking user exists or not 
    const user = await User.findById(userId)
    // if user not exist then send bad request
    if (!user) return res.status(400).json({ success: false, response: "user not exists" })
    // if user exists then compare password
    if (user) {
      const comparePasswords = await bcrypt.compare(req.body.authPassword, user.password)
      // if password match then delete user and send response
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
module.exports = router;