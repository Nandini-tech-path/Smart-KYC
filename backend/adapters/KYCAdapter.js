const KYC = require('../models/KYC');

class KYCAdapter {
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

module.exports = KYCAdapter;
