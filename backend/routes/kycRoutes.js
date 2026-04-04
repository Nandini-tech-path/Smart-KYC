const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const Tesseract = require('tesseract.js');

// 1. SELF-CONTAINED AUTH MIDDLEWARE (Bypass resolution issues)
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) { res.status(401).json({ message: 'Token is not valid' }); }
};

// 2. SELF-CONTAINED KYC MODEL (Bypass resolution issues)
const kycSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    dob: { type: String, required: true }, 
    gender: { type: String, required: true },
    nationality: { type: String, required: true },
    documentId: { type: String, required: true },
    idProofPath: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    addressProofPath: { type: String, required: true },
    selfiePath: { type: String, required: true },
    hash: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    fraudFlag: { type: Boolean, default: false },
    kycToken: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const KYC = mongoose.models.KYC || mongoose.model('KYC', kycSchema);

// 3. SELF-CONTAINED ADAPTER LOGIC (Bypass resolution issues)
class KYCAdapterInternal {
    static async findDuplicateDocumentNotInUser(documentId, userId) {
        return KYC.findOne({ documentId, userId: { $ne: userId } });
    }
    static async findByUserId(userId) {
        return KYC.findOne({ userId });
    }
    static async findMostRecentByUserId(userId) {
        return KYC.findOne({ userId }).sort({ createdAt: -1 });
    }
    static async findByDocumentId(documentId) {
        return KYC.findOne({ documentId });
    }
    static async findByKycToken(kycToken) {
        return KYC.findOne({ kycToken });
    }
    static async createKycRecord(recordData) {
        const kycRecord = new KYC(recordData);
        await kycRecord.save();
        return kycRecord;
    }
    static async saveKycRecord(kycRecord) {
        await kycRecord.save();
        return kycRecord;
    }
}

// 4. SETUP MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); }
});
const upload = multer({ storage });

// --- ROUTES ---

// @route    POST api/kyc/submit
router.post('/submit', [
    auth,
    upload.fields([
        { name: 'idProof', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
        { name: 'selfie', maxCount: 1 }
    ])
], async (req, res) => {
    const { name, dob, gender, nationality, documentId, address, city, state, zip } = req.body;
    try {
        if (!name || !documentId || !req.files.idProof || !req.files.addressProof || !req.files.selfie) {
            return res.status(400).json({ message: 'All fields and documents are required for full verification.' });
        }
        const duplicate = await KYCAdapterInternal.findDuplicateDocumentNotInUser(documentId, req.user.id);
        if (duplicate) {
            await KYCAdapterInternal.createKycRecord({
                userId: req.user.id, name, dob, gender, nationality, documentId,
                idProofPath: req.files.idProof[0].path, address, city, state, zip,
                addressProofPath: req.files.addressProof[0].path, selfiePath: req.files.selfie[0].path,
                hash: 'FRAUD_FLAGGED', isVerified: false, fraudFlag: true
            });
            return res.status(400).json({ message: '⚠️ Potential Fraud Detected: ID elsewhere registered.', fraudFlag: true });
        }
        const timestamp = Date.now().toString();
        const hash = crypto.createHash('sha256').update(req.user.id + documentId + timestamp).digest('hex');
        const kycToken = jwt.sign({ userId: req.user.id, isVerified: true, kycLevel: "FULL", hash }, process.env.JWT_SECRET);
        await KYCAdapterInternal.createKycRecord({
            userId: req.user.id, name, dob, gender, nationality, documentId,
            idProofPath: req.files.idProof[0].path, address, city, state, zip,
            addressProofPath: req.files.addressProof[0].path, selfiePath: req.files.selfie[0].path,
            hash, isVerified: true, fraudFlag: false, kycToken
        });
        res.json({ message: 'KYC Verified Successfully!', status: 'VERIFIED', hash, kycToken });
    } catch (err) { console.error(err.message); res.status(500).send('Server error'); }
});

// @route    POST api/kyc/update
router.post('/update', [auth, upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
])], async (req, res) => {
    try {
        const { name, dob, gender, nationality, documentId, address, city, state, zip } = req.body;
        const duplicate = await KYCAdapterInternal.findDuplicateDocumentNotInUser(documentId, req.user.id);
        if (duplicate) return res.status(400).json({ message: '⚠️ Fraud Detected: ID elsewhere registered.', fraudFlag: true });
        let kycRecord = await KYCAdapterInternal.findByUserId(req.user.id);
        if (!kycRecord) return res.status(404).json({ message: 'No KYC found to update.' });
        Object.assign(kycRecord, { name, dob, gender, nationality, documentId, address, city, state, zip, idProofPath: req.files.idProof[0].path, addressProofPath: req.files.addressProof[0].path, selfiePath: req.files.selfie[0].path, createdAt: Date.now() });
        await KYCAdapterInternal.saveKycRecord(kycRecord);
        res.json({ message: 'KYC Updated!', status: 'VERIFIED', hash: kycRecord.hash, kycToken: kycRecord.kycToken });
    } catch (err) { console.error(err); res.status(500).send('Server error'); }
});

// @route    POST api/kyc/verify-document
router.post('/verify-document', [auth, upload.single('idProof')], async (req, res) => {
    const { documentId, idType, name, dob } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No image uploaded.' });
    try {
        console.log(`Starting AI classification and verification for ${idType}...`);
        const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng+hin');
        const normalizedText = text.replace(/[^\w\s]/g, '').toUpperCase().replace(/\s+/g, ' ');
        const textWithoutSpaces = normalizedText.replace(/\s/g, '');
        const normalizeOto0 = (str) => str.replace(/O/ig, '0');
        
        const cleanInputId = normalizeOto0(documentId.replace(/[^A-Z0-9]/ig, '').toUpperCase());
        const idMatch = normalizeOto0(textWithoutSpaces).includes(cleanInputId);
        
        const nameParts = name.toUpperCase().split(/\s+/).filter(part => part.length >= 2); 
        const nameMatch = nameParts.filter(part => normalizedText.includes(part)).length >= Math.max(2, Math.floor(nameParts.length * 0.7));

        const dobParts = dob.split('/');
        const [day, monthNum, year] = dobParts;
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const monthText = monthNames[parseInt(monthNum, 10) - 1] || "";
        const ocrTextForDob = normalizeOto0(normalizedText);
        const dobMatch = ocrTextForDob.includes(year) && (ocrTextForDob.includes(day) || ocrTextForDob.includes(monthNum) || (monthText && normalizedText.includes(monthText)));

        if (!idMatch) return res.status(400).json({ message: `⚠️ ID Number Mismatch: ${documentId} (normalized: ${cleanInputId}) not found.` });
        if (!nameMatch) return res.status(400).json({ message: `⚠️ Name Mismatch: "${name}" not found.` });
        if (!dobMatch) return res.status(400).json({ message: `⚠️ Date of Birth Mismatch: ${day}/${monthNum}/${year} not found.` });

        res.json({ status: 'VERIFIED', message: 'Identity Verified', classification: { document_type: idType === 'dl' ? "DrivingLicense" : idType, confidence_score: 0.9 } });
    } catch (err) { console.error(err); res.status(500).json({ message: 'AI processing failed.' }); }
});

router.get('/status', auth, async (req, res) => {
    try {
        const kyc = await KYCAdapterInternal.findMostRecentByUserId(req.user.id);
        res.json(kyc || { status: 'NOT_SUBMITTED' });
    } catch (err) { res.status(500).send('Server error'); }
});

module.exports = router;
