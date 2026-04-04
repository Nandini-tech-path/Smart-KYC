const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // Connection pooling for Atlas scalability
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('MongoDB Atlas Connected...');
    } catch (err) {
        console.error('MongoDB Atlas Connection Error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
