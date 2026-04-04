const User = require('../models/User');

class UserAdapter {
    static async findByEmail(email) {
        return User.findOne({ email });
    }

    static async findByUsername(username) {
        return User.findOne({ username });
    }

    static async findByPhone(phone) {
        return User.findOne({ phone });
    }

    static async findByAadhaar(aadhaarHash) {
        return User.findOne({ aadhaarHash });
    }

    static async createUser(userData) {
        const user = new User(userData);
        await user.save();
        return user;
    }

    static async findById(id) {
        return User.findById(id);
    }
}

module.exports = UserAdapter;
