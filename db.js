const mongoose = require('mongoose');
const mongoUri = "mongodb+srv://nooblegendcoc:ritesh34567@ritesh-inotebook.fxr906h.mongodb.net/?retryWrites=true&w=majority";
mongoose.set('strictQuery', true)

const connectToMongo = () => {
    mongoose.connect(mongoUri, () => {
        console.log("database is connected to our system");
    })
}
module.exports = connectToMongo;