const mongoose = require('mongoose');
const mongoUri = "mongodb://127.0.0.1:27017/inotebook";
mongoose.set('strictQuery', true)

const connectToMongo = () =>{
    mongoose.connect(mongoUri, ()=>{
        console.log("database is connected to our system");
    })
}
module.exports = connectToMongo;