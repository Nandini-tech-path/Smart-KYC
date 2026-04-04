# SecureKYC API Documentation

This document outlines the REST API endpoints for the SecureKYC Network.

## Authentication
All private routes require the `x-auth-token` header.

### 1. Register User
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Body**: `{ username, email, password }`
- **Success**: `200 OK` with `{ token, user: { id, username, email } }`

### 2. Login User
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**: `{ email, password }`
- **Success**: `200 OK` with `{ token, user: { id, username, email } }`

---

## KYC Verification

### 3. Submit 4-Step KYC
- **URL**: `/api/kyc/submit`
- **Method**: `POST`
- **Headers**: `x-auth-token`, `Content-Type: multipart/form-data`
- **Form Fields**: 
  - Text: `name`, `dob`, `gender`, `nationality`, `documentId`, `address`, `city`, `state`, `zip`
  - Files: `idProof`, `addressProof`, `selfie`
- **Logic**: Performs duplicate check, anchors identity with SHA-256, and issues a JWT token.
- **Success**: `200 OK` with `{ message, status, hash, kycToken }`

### 4. Get KYC Status
- **URL**: `/api/kyc/status`
- **Method**: `GET`
- **Success**: Returns the full KYC record or `{ status: "NOT_SUBMITTED" }`

---

## Universal Token Verification (Public/Portals)

### 5. Verify KYC Token
- **URL**: `/api/kyc/verify-token`
- **Method**: `POST`
- **Body**: `{ kycToken }`
- **Success**: `200 OK` with `{ status, kycLevel, fraud, timestamp, message }`
- **Note**: Privacy-preserving. No raw document paths or sensitive PII are returned.
