const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
    console.log('Shuting Down...');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './config.env' });


const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.PASSWORD);
// const DB = process.env.DATABASE_LOCAL

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
    .then(() => console.log('Database Connected Successfully.'));



const port = 3000;
// app.listen returns server
const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Listening at port ${port}...`);
});

process.on('unhandledRejection', (err) => {
    console.log(err.name, err.message);
    // Closing the server in order to complete the ongoing requests
    server.close(() => {
        process.exit(1);
    });
});
