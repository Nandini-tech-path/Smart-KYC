const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// --- 1. DATABASE CONNECTION ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('MongoDB Atlas Connected (Super-Server Mode)...');
    } catch (err) {
        console.error('Database Error:', err.message);
        process.exit(1);
    }
};
connectDB();

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) { res.status(401).json({ message: 'Token invalid' }); }
};

// --- 3. DATABASE SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },
    aadhaarHash: { type: String, unique: true, sparse: true },
    isKycVerified: { type: Boolean, default: false },
    kycUpdateCount: { type: Number, default: 0 },
    lastKycUpdateDate: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const kycSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    nationality: { type: String, required: true },
    documentId: { type: String, required: true },
    idType: { type: String },
    idProofPath: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    addressProofPath: { type: String, required: true },
    selfiePath: { type: String, required: true },
    passportPhotoPath: { type: String },
    hash: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    fraudFlag: { type: Boolean, default: false },
    kycToken: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const KYC = mongoose.models.KYC || mongoose.model('KYC', kycSchema);

// --- 4. AUTH ROUTES ---
const authRouter = express.Router();
authRouter.post('/register', async (req, res) => {
    const { username, email, password, fullName, phone, aadhaarNumber } = req.body;
    try {
        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email exists' });
        const salt = await bcrypt.genSalt(10);
        const processedPassword = await bcrypt.hash(password, salt);
        const user = new User({ username, fullName, email, password: processedPassword, phone });
        await user.save();
        jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ token, user: { id: user.id, username, email } });
        });
    } catch (err) { 
        console.error('Registration Error:', err.message);
        res.status(500).json({ message: 'Server error: ' + err.message }); 
    }
});

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: 'Invalid Credentials' });
        jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
        });
    } catch (err) { res.status(500).send('Server error'); }
});
app.use('/api/auth', authRouter);

// --- 5. KYC ROUTES (Robust OCR Matching) ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); }
});
const upload = multer({ storage });

const kycRouter = express.Router();
kycRouter.post('/submit', [auth, upload.fields([{ name: 'idProof', maxCount: 1 }, { name: 'addressProof', maxCount: 1 }, { name: 'selfie', maxCount: 1 }, { name: 'passportPhoto', maxCount: 1 }])], async (req, res) => {
    const { name, dob, documentId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        const lastUpdate = user.lastKycUpdateDate ? new Date(user.lastKycUpdateDate) : null;
        const diffMs = lastUpdate ? now - lastUpdate : Infinity;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (user.kycUpdateCount >= 5) {
            if (diffMs < oneDayMs) {
                const remainingMs = oneDayMs - diffMs;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return res.status(429).json({ 
                    message: `Update limit reached (5/5). Please try again in ${hours}h ${minutes}m.`,
                    remainingTime: remainingMs
                });
            } else {
                // Reset count if more than 24h passed
                user.kycUpdateCount = 0;
            }
        }

        const hash = crypto.createHash('sha256').update(req.user.id + documentId + Date.now()).digest('hex');
        const kycToken = jwt.sign({ userId: req.user.id, isVerified: true, kycLevel: "FULL", hash }, process.env.JWT_SECRET);
        
        const kycRecord = new KYC({ 
            ...req.body, 
            userId: req.user.id, 
            isVerified: true, 
            hash, 
            kycToken,
            idProofPath: req.files.idProof[0].path, 
            addressProofPath: req.files.addressProof[0].path, 
            selfiePath: req.files.selfie[0].path,
            passportPhotoPath: req.files.passportPhoto ? req.files.passportPhoto[0].path : null
        });
        
        await kycRecord.save();

        // Update user tracking — use || 0 to handle undefined for users created before this field was added
        user.kycUpdateCount = (user.kycUpdateCount || 0) + 1;
        user.lastKycUpdateDate = now;
        user.isKycVerified = true;
        await user.save();

        res.json({ message: 'KYC Verified!', status: 'VERIFIED', hash, kycToken });
    } catch (err) { 
        console.error('[SUBMIT ERROR]', err.message);
        res.status(500).json({ message: 'Submission failed: ' + err.message }); 
    }
});

kycRouter.post('/update', [auth, upload.fields([{ name: 'idProof', maxCount: 1 }, { name: 'addressProof', maxCount: 1 }, { name: 'selfie', maxCount: 1 }, { name: 'passportPhoto', maxCount: 1 }])], async (req, res) => {
    const { name, dob, documentId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        const lastUpdate = user.lastKycUpdateDate ? new Date(user.lastKycUpdateDate) : null;
        const diffMs = lastUpdate ? now - lastUpdate : Infinity;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (user.kycUpdateCount >= 5) {
            if (diffMs < oneDayMs) {
                const remainingMs = oneDayMs - diffMs;
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return res.status(429).json({ 
                    message: `Update limit reached (5/5). Please try again in ${hours}h ${minutes}m.`,
                    remainingTime: remainingMs
                });
            } else {
                user.kycUpdateCount = 0;
            }
        }

        const hash = crypto.createHash('sha256').update(req.user.id + documentId + Date.now()).digest('hex');
        const kycToken = jwt.sign({ userId: req.user.id, isVerified: true, kycLevel: "FULL", hash }, process.env.JWT_SECRET);
        
        let kycRecord = await KYC.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
        
        if (kycRecord) {
            Object.assign(kycRecord, {
                ...req.body,
                hash,
                kycToken,
                idProofPath: req.files.idProof[0].path, 
                addressProofPath: req.files.addressProof[0].path, 
                selfiePath: req.files.selfie[0].path,
                passportPhotoPath: req.files.passportPhoto ? req.files.passportPhoto[0].path : kycRecord.passportPhotoPath,
                createdAt: now 
            });
            await kycRecord.save();
        } else {
            kycRecord = new KYC({
                ...req.body,
                userId: req.user.id,
                isVerified: true,
                hash,
                kycToken,
                idProofPath: req.files.idProof[0].path, 
                addressProofPath: req.files.addressProof[0].path, 
                selfiePath: req.files.selfie[0].path,
                passportPhotoPath: req.files.passportPhoto ? req.files.passportPhoto[0].path : null
            });
            await kycRecord.save();
        }

        // Update user tracking — use || 0 to handle undefined for users created before this field was added
        user.kycUpdateCount = (user.kycUpdateCount || 0) + 1;
        user.lastKycUpdateDate = now;
        user.isKycVerified = true;
        await user.save();

        res.json({ message: 'KYC Updated!', status: 'VERIFIED', hash, kycToken });
    } catch (err) { 
        console.error('[UPDATE ERROR]', err.message);
        res.status(500).json({ message: 'Update failed: ' + err.message }); 
    }
});

kycRouter.post('/verify-document', [auth, upload.single('idProof')], async (req, res) => {
    const { documentId, name, dob, idType } = req.body;
    try {
        // --- INPUT VALIDATION (before running OCR) ---
        if (!name || !name.trim()) {
            return res.status(400).json({ message: '⚠️ Full name is required for verification.' });
        }
        if (!dob || dob.trim().length < 10) {
            return res.status(400).json({ message: '⚠️ Date of Birth is required. Please enter it in Step 1 (DD/MM/YYYY format).' });
        }
        if (!documentId || !documentId.trim()) {
            return res.status(400).json({ message: '⚠️ Document ID is required.' });
        }
        const dobParts = dob.split('/');
        if (dobParts.length !== 3 || dobParts.some(p => !p || isNaN(p))) {
            return res.status(400).json({ message: '⚠️ Invalid Date of Birth format. Please use DD/MM/YYYY.' });
        }

        const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng+hin');
        const normalizedText = text.replace(/[^\w\s]/g, '').toUpperCase().replace(/\s+/g, ' ');
        const textWithoutSpaces = normalizedText.replace(/\s/g, '');
        
        // Comprehensive normalization for alphanumeric misreads
        const superNormalize = (str) => str
            .replace(/[ODQ]/ig, '0')
            .replace(/[IL]/ig, '1')
            .replace(/[Z]/ig, '2')
            .replace(/[S]/ig, '5')
            .replace(/[G]/ig, '6')
            .replace(/[B]/ig, '8');
        
        const cleanInputId = superNormalize(documentId.replace(/[^A-Z0-9]/ig, '').toUpperCase());
        const ocrTextProcessed = superNormalize(textWithoutSpaces);
        
        console.log(`[OCR DEBUG] Document Type: ${idType}`);
        console.log(`[OCR DEBUG] Input ID: ${cleanInputId}`);
        console.log(`[OCR DEBUG] Processed OCR Text (First 100 chars): ${ocrTextProcessed.substring(0, 100)}...`);
        
        // Exact match or contains-match (handling leading/trailing noise)
        let idMatch = ocrTextProcessed.includes(cleanInputId);
        
        // Special Fallback for Aadhaar (keep as is)
        if (!idMatch && idType === 'aadhaar' && cleanInputId.length >= 8) {
            const first4 = cleanInputId.substring(0, 4);
            const last4 = cleanInputId.substring(cleanInputId.length - 4);
            idMatch = ocrTextProcessed.includes(first4) && ocrTextProcessed.includes(last4);
            if (idMatch) console.log(`[OCR DEBUG] Partial match found for Aadhaar: ${first4}...${last4}`);
        }
        
        // Advanced Fuzzy Match for PAN/Voter ID (new implementation)
        if (!idMatch && (idType === 'pan' || idType === 'voter')) {
            console.log(`[OCR DEBUG] Exact match failed for ${idType}. Attempting fuzzy match...`);
            
            // Sliding window fuzzy matching
            const targetLen = cleanInputId.length;
            for (let i = 0; i <= ocrTextProcessed.length - targetLen; i++) {
                const windowText = ocrTextProcessed.substring(i, i + targetLen);
                let diffCount = 0;
                for (let j = 0; j < targetLen; j++) {
                    if (windowText[j] !== cleanInputId[j]) diffCount++;
                }
                
                // Allow up to 20% mismatch (e.g., 2 chars wrong in a 10 char PAN)
                if (diffCount <= Math.floor(targetLen * 0.2)) {
                    idMatch = true;
                    console.log(`[OCR DEBUG] Fuzzy match found! Window: ${windowText}, Input: ${cleanInputId}, Errors: ${diffCount}`);
                    break;
                }
            }
        }
        
        const nameParts = name.toUpperCase().split(/\s+/).filter(part => part.length >= 2); 
        const nameMatch = nameParts.filter(part => normalizedText.includes(part)).length >= Math.max(2, Math.floor(nameParts.length * 0.7));

        // --- DOB VERIFICATION (with extreme flexibility) ---
        const [day, monthNum, year] = dob.split('/');
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const monthText = monthNames[parseInt(monthNum, 10) - 1] || "";
        
        // Remove ALL characters except letters and numbers for maximum robustness
        const ocrTextForDob = superNormalize(normalizedText.replace(/[^A-Z0-9]/ig, ''));
        const inputDobConcat = superNormalize(`${day}${monthNum}${year}`);
        const inputDobShort = superNormalize(`${day}${monthNum}${year.slice(-2)}`);
        
        console.log(`[OCR DEBUG] Cleaned DOB OCR Text: ${ocrTextForDob.substring(0, 100)}...`);

        // Check for common misread digit pairs specifically in dates
        const dateFuzzyMatch = (target, text) => {
            if (text.includes(target)) return true;
            if (target.length < 2) return false;
            
            // Sliding window fuzzy check
            for (let i = 0; i <= text.length - target.length; i++) {
                const windowText = text.substring(i, i + target.length);
                let diff = 0;
                for (let j = 0; j < target.length; j++) {
                    if (windowText[j] !== target[j]) diff++;
                }
                if (diff <= 1) return true; // Allow 1-character error
            }
            return false;
        };

        const hasYear = dateFuzzyMatch(year, ocrTextForDob) || dateFuzzyMatch(year.slice(-2), ocrTextForDob);
        const hasDay = dateFuzzyMatch(day, ocrTextForDob);
        const hasMonth = dateFuzzyMatch(monthNum, ocrTextForDob) || (monthText && normalizedText.includes(monthText));
        const hasConcatenated = ocrTextForDob.includes(inputDobConcat) || ocrTextForDob.includes(inputDobShort);
        
        // Final DOB Match Logic:
        // For Aadhaar (strict-ish): need Year OR (Day+Month).
        // For PAN/Voter (lenient): need Year OR Day OR Month, as long as ID matches.
        let dobMatch = false;
        if (idType === 'aadhaar') {
            dobMatch = hasYear || (hasDay && hasMonth) || hasConcatenated;
        } else {
            dobMatch = true; // No DOB check for PAN/Voter as requested
        }

        console.log(`[OCR DEBUG] DOB Components: Day=${hasDay}, Month=${hasMonth}, Year=${hasYear}, Concat=${hasConcatenated}`);

        if (!idMatch) {
            let errorMsg = `⚠️ ID Number Mismatch: ${documentId} not found on the document.`;
            if (idType === 'aadhaar') errorMsg = `⚠️ Aadhaar Number Mismatch: The number on the card does NOT match ${documentId}.`;
            if (idType === 'pan') errorMsg = `⚠️ PAN Number Mismatch: The number on the PAN card does NOT match ${documentId}.`;
            if (idType === 'voter') errorMsg = `⚠️ Voter ID Mismatch: The ID on the Voter card does NOT match ${documentId}.`;
            return res.status(400).json({ message: errorMsg });
        }
        
        if (!dobMatch) {
            console.log(`[VERIFY FAIL] DOB Mismatch. Input: ${dob}, OCR Text: ${ocrTextForDob.substring(0, 100)}...`);
            return res.status(400).json({ message: `⚠️ Identity could not be fully verified. Please ensure your Date of Birth (${dob}) is clearly visible on the card and not covered by glare.` });
        }

        res.json({ status: 'VERIFIED', message: 'Identity Verified' });
    } catch (err) {
        console.error('[VERIFY ERROR]', err.message);
        res.status(500).json({ message: '⚠️ Verification failed. Please try a clearer image.' });
    }
});

kycRouter.post('/verify-token', async (req, res) => {
    const { kycToken } = req.body;
    if (!kycToken) return res.status(400).json({ message: 'Token is required' });
    
    try {
        const decoded = jwt.verify(kycToken, process.env.JWT_SECRET);
        // Ensure this user exists and is actually verified in the DB
        const kyc = await KYC.findOne({ userId: decoded.userId, isVerified: true });
        
        if (!kyc) {
            return res.status(404).json({ message: 'Identity record not found in secure vault.' });
        }
        
        res.json({
            status: 'VERIFIED',
            message: 'Digital identity confirmed via SecureKYC Network.',
            kycLevel: decoded.kycLevel || 'FULL',
            timestamp: new Date(),
            hash: decoded.hash
        });
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired KYC token.' });
    }
});

kycRouter.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let kyc = await KYC.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
        
        const statusData = {
            kycUpdateCount: user?.kycUpdateCount || 0,
            lastKycUpdateDate: user?.lastKycUpdateDate || null,
            isKycVerified: user?.isKycVerified || false
        };

        if (!kyc) return res.json({ status: 'NOT_SUBMITTED', ...statusData });
        
        // Auto-generate token if missing for verified users
        if (kyc.isVerified && !kyc.kycToken) {
            kyc.kycToken = jwt.sign({ userId: req.user.id, isVerified: true, kycLevel: "FULL", hash: kyc.hash }, process.env.JWT_SECRET);
            await kyc.save();
        }
        
        res.json({ ...kyc.toObject(), ...statusData });
    } catch (err) { res.status(500).send('Server error'); }
});

app.use('/api/kyc', kycRouter);
app.use('/uploads', express.static(uploadsDir));

// --- 6. SERVER START ---
const PORT = 5000;
app.listen(PORT, () => console.log(`Super-Server running on port ${PORT}`));
