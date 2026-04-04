const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    fullName: { type: String }, // Making optional to retain front-end stability
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, unique: true, sparse: true, index: true },
    password: { type: String, required: true },
    aadhaarHash: { type: String, unique: true, sparse: true, index: true },
    panNumber: { type: String, unique: true, sparse: true, index: true },
    kycStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    kycUpdateCount: { type: Number, default: 0 },
    lastKycUpdateDate: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
