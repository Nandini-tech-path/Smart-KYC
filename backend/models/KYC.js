const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Step 1: Personal Details
    name: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    nationality: { type: String, required: true },
    
    // Step 2: Identity Verification
    documentId: { type: String, required: true }, // Aadhaar/PAN
    idProofPath: { type: String, required: true },

    // Step 3: Address Verification
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    addressProofPath: { type: String, required: true },

    // Step 4: Face Verification
    selfiePath: { type: String, required: true },

    // System Status
    hash: { type: String, required: true }, // SHA-256 hash
    isVerified: { type: Boolean, default: false },
    fraudFlag: { type: Boolean, default: false },
    kycToken: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KYC', kycSchema);
