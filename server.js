const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
    console.log('Shuting Down...');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './config.env' });


const app = require('./app');

//const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.PASSWORD);
const DB = process.env.DATABASE_LOCAL

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
    .then(() => console.log('Database Connected Successfully.'));

// const port = process.env.PORT || 3000;
const port = process.env.PORT;
// app.listen returns server
const server = app.listen(port, () => {
    console.log(`Listening at port ${port}...`);
});

process.on('unhandledRejection', (err) => {
    console.log(err.name, err.message);
    // Closing the server in order to complete the ongoing requests
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED. Shutting Down gracefully.');
    server.close(() => {
        console.log('Process terminated!');
    });
});
