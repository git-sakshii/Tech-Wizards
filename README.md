
# CodeShield - Security Scanning Application

CodeShield is a comprehensive application for scanning code repositories and files for security vulnerabilities.

## Features

- Repository scanning with selective file scanning
- File uploading and scanning
- Real-time progress tracking
- Vulnerability reports with AI-powered fix suggestions
- Automatic code fixing and downloading
- Historical scan data
- Dashboard with security metrics

## Setup

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/codeshield.git
cd codeshield
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/codeshield
JWT_SECRET=your-secret-key
```

4. Seed the database with sample data
```
node src/server/seed.js
```

5. Start the development server
```
npm run dev
```

### Running in Production

```
npm run build
npm start
```

## Using CodeShield

### Scanning Repositories

1. Navigate to the "Scan" page
2. Enter a Git repository URL
3. Click "List Files" to view available code files in the repository
4. Select the files you want to scan
5. Click "Start Repository Scan"
6. View the results and apply suggested fixes

### Scanning Individual Files

1. Navigate to the "Scan" page
2. Select the "Upload Files" tab
3. Drag and drop or select files to scan
4. Click "Start File Scan"
5. View the results and apply suggested fixes

### Applying Fixes

1. After scanning, view the identified vulnerabilities
2. Click "Fix All Issues" to apply the AI-suggested fixes
3. Download the fixed code files as a ZIP archive
4. Replace your vulnerable code with the fixed version

## Database Models

The application uses MongoDB with the following main collections:

- Users - Stores user authentication information
- Scans - Stores scan metadata and results
- Vulnerabilities - Stores detailed vulnerability information

## Test Account

After seeding the database, you can use the following test account:

- Email: test@example.com
- Password: password123

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/verify-otp - Verify email with OTP
- POST /api/auth/login - Login
- GET /api/auth/me - Get current user

### Scanning
- GET /api/repository/files - List files from a repository
- POST /api/scan/repository/files - Scan selected repository files
- GET /api/scan/repository/:scanId/status - Get scan status
- GET /api/scan/repository/:scanId/results - Get scan results
- POST /api/scan/:scanId/apply-fixes - Apply fixes to vulnerabilities
- POST /api/scan/file - Upload and scan a file

### Dashboard
- GET /api/dashboard - Get dashboard statistics
- GET /api/scan-history - Get scan history
- GET /api/repositories - Get repositories
- GET /api/vulnerabilities - Get vulnerabilities

## License

MIT
