const connectToMongo = require('./db');
const express = require('express')
const app = express();
const port = 1000;
connectToMongo();

// middleware
app.use(express.json());

app.use('/api/notes/', require('./route/notes'));
app.use('/api/auth/', require('./route/auth'));

app.listen(port, () => {
    console.log(`app is listening on port no ${port}`);
})

