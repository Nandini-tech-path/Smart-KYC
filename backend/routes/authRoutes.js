const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// 1. SELF-CONTAINED USER MODEL
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },
    aadhaarHash: { type: String, unique: true, sparse: true },
    isKycVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// 2. SELF-CONTAINED ADAPTER LOGIC
class UserAdapterInternal {
    static async findByEmail(email) { return User.findOne({ email }); }
    static async findByUsername(username) { return User.findOne({ username }); }
    static async findByPhone(phone) { return User.findOne({ phone }); }
    static async findByAadhaar(aadhaarHash) { return User.findOne({ aadhaarHash }); }
    static async createUser(userData) {
        const user = new User(userData);
        await user.save();
        return user;
    }
}

// 3. SECURITY LIMITERS
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many accounts created, try later.' }
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { message: 'Too many login attempts, try later.' }
});

const isValidPassword = (p) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// @route    POST api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
    const { username, email, password, fullName, phone, aadhaarNumber } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' });
    if (!isValidPassword(password)) return res.status(400).json({ message: 'Weak password' });
    try {
        if (await UserAdapterInternal.findByEmail(email)) return res.status(400).json({ message: 'Email exists' });
        if (await UserAdapterInternal.findByUsername(username)) return res.status(400).json({ message: 'Username taken' });
        
        let aadhaarHashVal = undefined;
        if (aadhaarNumber) {
            aadhaarHashVal = crypto.createHash('sha256').update(aadhaarNumber).digest('hex');
            if (await UserAdapterInternal.findByAadhaar(aadhaarHashVal)) return res.status(400).json({ message: 'Duplicate Aadhaar' });
        }

        const salt = await bcrypt.genSalt(10);
        const processedPassword = await bcrypt.hash(password, salt);
        const user = await UserAdapterInternal.createUser({ username, fullName, email, password: processedPassword, phone, aadhaarHash: aadhaarHashVal });

        jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ token, user: { id: user.id, username, email } });
        });
    } catch (err) { console.error(err); res.status(500).send('Server error'); }
});

// @route    POST api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await UserAdapterInternal.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }
        jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
        });
    } catch (err) { console.error(err); res.status(500).send('Server error'); }
});

module.exports = router;
