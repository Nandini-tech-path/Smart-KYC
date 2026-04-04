# SecureKYC – Universal Token-Based Identity verification System

Welcome to **SecureKYC**, a full-stack MERN application that demonstrates a real-world, privacy-preserving identity verification workflow.

## 🚀 Setup Instructions

### Pre-requisites
-   Node.js (v18+)
-   MongoDB (Running locally or MongoDB Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file with:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/smart-kyc
# JWT_SECRET=your_secure_secret
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage Flow
1.  Navigate to `http://localhost:5173/` (Landing Page).
2.  **Register** a new account.
3.  **Login** to reach the dashboard.
4.  **Dashboard Home**: Read the project overview.
5.  **Complete KYC**: Use the 4-step wizard to upload identity/address/selfie.
6.  **Universal Token**: Once verified, copy your **KYC Token**.
7.  **Organization Portals**: Paste the token into the Bank, UPI, or E-commerce portals to verify your identity without sharing raw files.

---

## 🛠️ Tech Stack
-   **Frontend**: React, Lucide Icons, Axios, React Router.
-   **Backend**: Node.js, Express, Multer (File Handling), Crypto (SHA-256).
-   **Database**: MongoDB (Mongoose).
-   **Security**: JWT Authentication, Bcrypt Password Hashing.

## 🔐 Security & Privacy
-   **SHA-256 Anchoring**: Identity is anchored with a unique hash (UserId + ID Number + Timestamp).
-   **Privacy-Preserving**: Organizations only receive a "VERIFIED" status and "KYC Level", preserving user PII.
-   **Fraud Detection**: Integrated logic flags duplicate document IDs across the network.
