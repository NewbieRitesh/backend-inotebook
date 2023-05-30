const connectToMongo = require('./db');
const express = require('express')
const cors = require("cors");
const app = express();
const port = 1000;
connectToMongo();
require('dotenv').config()

app.use(cors());

// middleware
app.use(express.json());

app.use('/api/notes/', require('./route/notes'));
app.use('/api/auth/', require('./route/auth'));

app.listen(process.env.PORT || port, () => {
    console.log(`app is listening on port no ${port}`);
})

