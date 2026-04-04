require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const KYC = require('../models/KYC');

const deleteAll = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!\n');

        const userCount = await User.countDocuments();
        const kycCount = await KYC.countDocuments();

        console.log(`Found ${userCount} user(s) and ${kycCount} KYC record(s).`);

        await User.deleteMany({});
        console.log('✅ All users deleted.');

        await KYC.deleteMany({});
        console.log('✅ All KYC records deleted.');

        console.log('\nDatabase cleaned successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

deleteAll();
