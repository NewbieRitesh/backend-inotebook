const express = require('express');
const User = require('../modules/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');

const JWT_Token = 'King';


// Route 1: create user           no login required
router.post('/createuser',
  [
    body('name').isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ], async (req, res) => {
    // for validation errors
    const errors = validationResult(req);
    // checking is there is any error in this validation or not if yes then send errors to user
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      let user = await User.findOne({ email: req.body.email });
      // checking user is exists or not if yes then send error 
      if (user) {
        return res.status(400).json({ success: false, error: "sorry this email is already regestered" })
      }
      //creating a user
      const salt = await bcrypt.genSalt(10)
      const securePassword = await bcrypt.hashSync(req.body.password, salt)
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: securePassword
      })
      // generating JWT Token
      data = {
        user: {
          id: user.id
        }
      }
      const authToken = jwt.sign(data, JWT_Token)
      res.status(200).json({ success: true, authToken })
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, error: "some error occured" })
    }
  }
)

// Route 2: Login          no login reqired
router.post('/login',
  [
    body('email', 'Enter a valid Email').isEmail(),
    body('password', 'Enter a valid Password').isLength({ min: 6 })
  ], async (req, res) => {
    //if error occured, return a bad request and errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.errors });
    }
    const { email, password } = req.body;
    // check weather the user with this email is exist or not
    try {
      let user = await User.findOne({ email: email });
      console.log(user);
      if (!user) {
        return res.status(400).json({ success: false, error: "Enter valid credentials" })
      }

      const passwordCompare = await bcrypt.compare(password, user.password)
      if (!passwordCompare) {
        return res.status(400).json({ success: false, error: "Enter valid credentials" })
      }
      const data = {
        user: {
          id: user.id
        }
      }
      const authToken = jwt.sign(data, JWT_Token)
      console.log(authToken);
      res.json({ success: true, authToken })
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, error: "some error occured" })
    }
  }
)

// Route 3: get loged in user details           login required
router.post('/getuser', fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    res.send(user)
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route 4: update user datails
router.put('/update-user-data/:id', fetchuser, body('name', 'Name should be minimum 3 characters').isLength({ min: 3 }), async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.params.id;

    // for validation errors
    const errors = validationResult(req);
    // checking is there is any error in this validation or not if yes then send errors to user
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let user = await User.findById(userId).select("-password")
    console.log("this is user before update" + user)
    if (!user) {
      return res.status(404).json({ success: false, error })
    }
    console.log(user);
    user = await User.findByIdAndUpdate(userId, { $set: { name } }, { new: true })
    console.log("this is user after update" + user)

    res.json({ status: true, name })
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route: 5 authenticate user to update credentials
router.post('/authenticate/:id', fetchuser, [body('password', 'Enter a valid Password').isLength({ min: 6 })], async (req, res) => {
  // for validation errors
  const errors = validationResult(req);
  // checking is there is any error in this validation or not if yes then send errors to user
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { password } = req.body
    const userId = req.params.id
    const user = await User.findById(userId)
    console.log(user);

    // comparing passwords
    const comparePasswords = await bcrypt.compare(password, user.password)
    if (comparePasswords) {
      res.json({ success: true, comparePasswords })
    }
    else {
      return res.status(400).json({ success: false, error: "Wrong Password" })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

// Route: 6 update user credentials
router.post('/update-user-email/:id', fetchuser, async (req, res) => {
  try {
    console.log(req.body);
    const { email, authPassword } = req.body
    const userId = req.params.id;
    let user = await User.findById(userId)
    console.log("old user obj", user)
    if (user) {
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      if (comparePasswords === true) {
        if (email) {
          user = await User.findByIdAndUpdate(userId, { $set: { email } }, { new: true })
          console.log("new user obj", user)
          res.status(200).json({ success: true, email })
        }
      }
      else {
        res.status(400).json({ success: false, error: "invalid password" })
      }
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})

router.put('/update-user-password/:id', fetchuser, async (req, res) => {
  try {
    console.log(req.body);
    const { newPassword, authPassword } = req.body
    const userId = req.params.id;
    let user = await User.findById(userId)
    console.log("old user obj", user)
    if (user) {
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      if (comparePasswords === true) {
        if (newPassword) {
          const newPlainPassword = newPassword
          const salt = await bcrypt.genSalt(10)
          const newHashPassword = await bcrypt.hash(newPlainPassword, salt)
          user = await User.findByIdAndUpdate(userId, { $set: { password: newHashPassword } }, { new: true })
          console.log(user);
          res.status(200).json({ success: true, response: "password changed successfully" })
        }
      }
      else {
        res.status(400).json({ success: false, error: "invalid password" })
      }
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})
router.delete('/delete-user/:id', fetchuser, async (req, res) => {
  try {
    const { authPassword } = req.body;
    const userId = req.params.id
    const user = await User.findById(userId)
    if (user) {
      const comparePasswords = await bcrypt.compare(authPassword, user.password)
      if (comparePasswords === true) {
        const deletedUser = await User.findByIdAndDelete(userId)
        console.log(deletedUser)
        res.status(200).json({ success: true, deletedUser })
      }
      else {
        res.status(400).json({ success: false, error: "invalid password" })
      }
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "some error occured" })
  }
})
module.exports = router;
