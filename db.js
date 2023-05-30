const mongoose = require('mongoose');
require('dotenv').config()
const mongoUri = process.env.MONGOURI;
mongoose.set('strictQuery', true)

const connectToMongo = () => {
    mongoose.connect(mongoUri, () => {
        console.log("database is connected to our system");
    })
}
module.exports = connectToMongo;