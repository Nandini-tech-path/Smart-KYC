const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const UserAdapter = require('../adapters/UserAdapter'); // Imported Adapter

// Atlas Registration Constraints and Security Measures
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many accounts created from this IP, please try again after 15 minutes' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5,
    message: { message: 'Too many login attempts, your IP is temporarily blocked.' }
});

const isValidPassword = (password) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// @route    POST api/auth/register
// @desc     Register user
// @access   Public
router.post('/register', registerLimiter, async (req, res) => {
    const { username, email, password, fullName, phone, aadhaarNumber } = req.body;

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character' });
    }

    try {
        let userByEmail = await UserAdapter.findByEmail(email);
        if (userByEmail) return res.status(400).json({ message: 'Email already exists' });

        let userByUsername = await UserAdapter.findByUsername(username);
        if (userByUsername) return res.status(400).json({ message: 'Username is already taken' });

        if (phone) {
            if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
            let userByPhone = await UserAdapter.findByPhone(phone);
            if (userByPhone) return res.status(400).json({ message: 'Phone already exists' });
        }

        let aadhaarHashVal = undefined;
        if (aadhaarNumber) {
            aadhaarHashVal = crypto.createHash('sha256').update(aadhaarNumber).digest('hex');
            let userByAadhaar = await UserAdapter.findByAadhaar(aadhaarHashVal);
            if (userByAadhaar) return res.status(400).json({ message: 'Duplicate Aadhaar detected' });
        }

        const salt = await bcrypt.genSalt(10);
        const processedPassword = await bcrypt.hash(password, salt);

        const userData = {
            username,
            fullName,
            email,
            password: processedPassword,
            phone,
            aadhaarHash: aadhaarHashVal
        };

        const user = await UserAdapter.createUser(userData);

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' }, // Strong Authentication: 15-min token logic integration
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    POST api/auth/login
// @desc     Authenticate user & get token
// @access   Public
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await UserAdapter.findByEmail(email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
