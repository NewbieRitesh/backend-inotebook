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
    const errors = validationResult(req);
    // checking is there is any error in this validation or not if yes then send errors to user
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      let user = await User.findOne({ email: req.body.email });
      // checking user is exists or not if yes then send error 
      if (user) {
        return res.status(400).json({ error: "sorry this email is already regestered" })
      }
      //creating a user
      const salt = await bcrypt.genSalt(10)
      const securePassword = await bcrypt.hashSync(req.body.password, salt)
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: securePassword
      })
      // res.json(user)
      data = {
        id: user.id
      }
      const authToken = jwt.sign(data, JWT_Token)
      res.json({ authToken })
      console.log(authToken);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('some error occured')
    }
  }
)

// Router 2: Login          no login reqired
router.post('/login',
  [
    body('email', 'Enter a valid Email').isEmail(),
    body('password', 'Enter a valid Password').isLength({ min: 6 })
  ], async (req, res) => {
    //if error occured, return a bad request and errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    // check weather the user with this email is exist or not
    try {
      let user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(400).json({ error: "Enter valid credentials" })
      }

      const passwordCompare = await bcrypt.compare(password, user.password)
      if (!passwordCompare) {
        return res.status(400).json({ error: "Enter valid credentials" })
      }
      // res.json(user)
      const data = {
        user: {
          id: user.id
        }
      }
      const authToken = jwt.sign(data, JWT_Token)
      res.json({ authToken })
      // console.log(authToken);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('some error occured')
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
    console.error(error.message)
    res.status(500).send('some error occured')
  }
})
module.exports = router;