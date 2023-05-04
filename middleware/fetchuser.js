const jwt = require('jsonwebtoken');
const JWT_Token = 'King';

const fetchuser = (req, res, next) => {
    // get the user from jwt token and add id to req object
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({error: "Please authonticate user with valid token"})
    }
    try {
        const data = jwt.verify(token, JWT_Token);
        req.user = data.user;
        next();
    } catch (error) {
        res.status(401).send({error: "Please authonticate user with valid token"})
    }
}

module.exports = fetchuser