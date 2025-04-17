require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { User, OTP, PasswordReset } = require('./models');
const { sendOtpEmail, sendPasswordResetEmail } = require('./emailService');
const repoScanner = require('./repoScanner');
const securityScanner = require('./securityScanner');
const crypto = require('crypto');
const axios = require('axios');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI , {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user (not verified yet)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
    });
    await newUser.save();
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP to database (expires in 10 minutes)
    const otpRecord = new OTP({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
    await otpRecord.save();
    
    // Send OTP to user's email
    await sendOtpEmail(email, otp);
    
    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify OTP endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find the most recent valid OTP for this email
    const otpRecord = await OTP.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Mark user as verified
    await User.findOneAndUpdate({ email }, { isVerified: true });
    
    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user data' });
  }
});

// Get repository files
app.get('/api/repository/files', authenticateToken, async (req, res) => {
  try {
    const { repositoryUrl, branch = 'main' } = req.query;
    
    if (!repositoryUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }
    
    // Create a temporary directory to clone the repo
    const tempDir = path.join(os.tmpdir(), `repo-${Date.now()}`);
    
    // Clone the repository
    try {
      // First create the directory
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Clone with depth 1 to speed things up (we only need the latest version)
      await new Promise((resolve, reject) => {
        exec(`git clone --depth 1 --branch ${branch} ${repositoryUrl} ${tempDir}`, (error) => {
          if (error) {
            console.error('Clone error:', error);
            reject(new Error(`Failed to clone repository: ${error.message}`));
            return;
          }
          resolve();
        });
      });
    } catch (error) {
      console.error('Repository clone error:', error);
      return res.status(400).json({ message: 'Failed to access repository: ' + error.message });
    }
    
    // Function to scan directory recursively
    const scanDirectory = (dir, baseDir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let results = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        // Skip .git directory
        if (entry.name === '.git') continue;
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          results = results.concat(scanDirectory(fullPath, baseDir));
        } else {
          // Add files to results
          results.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: fs.statSync(fullPath).size
          });
        }
      }
      
      return results;
    };
    
    // Scan the repository for files
    const files = scanDirectory(tempDir, tempDir);
    
    // Clean up the cloned repository
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    res.status(200).json(files);
  } catch (error) {
    console.error('Repository files error:', error);
    res.status(500).json({ message: 'Server error fetching repository files' });
  }
});

// Scan specific files from repository
app.post('/api/scan/repository/files', authenticateToken, async (req, res) => {
  try {
    const { repositoryUrl, filePaths, branch = 'main' } = req.body;
    const userId = req.user.id;
    
    if (!repositoryUrl || !filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ message: 'Repository URL and file paths are required' });
    }
    
    // Generate a scan ID
    const scanId = crypto.randomBytes(16).toString('hex');
    
    // Initialize scan record
    const Scan = mongoose.model('Scan');
    const newScan = new Scan({
      scanId,
      userId,
      repositoryUrl,
      branch,
      status: 'initiated',
      progress: 0,
      timestamp: new Date(),
      vulnerabilities: 0,
      summary: {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
      },
      filesScanned: filePaths.length
    });
    
    await newScan.save();
    
    // Start the scan process in the background
    scanRepository(userId, scanId, repositoryUrl, filePaths, branch);
    
    res.status(200).json({ scanId });
  } catch (error) {
    console.error('Repository file scan error:', error);
    res.status(500).json({ message: 'Failed to start repository scan' });
  }
});

// Function to handle repository scanning in the background
async function scanRepository(userId, scanId, repositoryUrl, filePaths, branch) {
  const Scan = mongoose.model('Scan');
  const Vulnerability = mongoose.model('Vulnerability');
  
  try {
    // Update scan status to processing
    await Scan.findOneAndUpdate(
      { scanId, userId },
      { 
        status: 'processing',
        progress: 10
      }
    );
    
    // Create a temporary directory to clone the repo
    const tempDir = path.join(os.tmpdir(), `scan-${scanId}`);
    
    try {
      // First create the directory
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Clone the repository
      await new Promise((resolve, reject) => {
        exec(`git clone --depth 1 --branch ${branch} ${repositoryUrl} ${tempDir}`, (error) => {
          if (error) {
            console.error('Clone error:', error);
            reject(new Error(`Failed to clone repository: ${error.message}`));
            return;
          }
          resolve();
        });
      });
      
      // Update progress
      await Scan.findOneAndUpdate(
        { scanId, userId },
        { progress: 30 }
      );
      
      // Process each file
      const vulnerabilities = [];
      let totalProcessed = 0;
      
      for (const filePath of filePaths) {
        // Get the file extension to determine language
        const fileExtension = path.extname(filePath).toLowerCase().substring(1);
        let language = 'javascript'; // default
        
        const languageMap = {
          'js': 'javascript',
          'ts': 'typescript',
          'jsx': 'javascript',
          'tsx': 'typescript',
          'py': 'python',
          'java': 'java',
          'go': 'go',
          'rb': 'ruby',
          'php': 'php',
          'cs': 'csharp',
          'c': 'c',
          'cpp': 'cpp',
        };
        
        if (languageMap[fileExtension]) {
          language = languageMap[fileExtension];
        }
        
        // Read the file content
        const fullPath = path.join(tempDir, filePath);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Scan the file for vulnerabilities
        const scanResult = await securityScanner.scanCode(fileContent, language);
        
        // Add found vulnerabilities
        for (const vuln of scanResult.vulnerabilities) {
          if (vuln.type !== 'No Issues Detected') {
            vulnerabilities.push({
              ...vuln,
              location: {
                ...vuln.location,
                file: filePath
              }
            });
          }
        }
        
        // Update progress
        totalProcessed++;
        const progressValue = 30 + Math.floor((totalProcessed / filePaths.length) * 60);
        
        await Scan.findOneAndUpdate(
          { scanId, userId },
          { progress: progressValue }
        );
      }
      
      // Calculate summary counts
      const summary = {
        totalVulnerabilities: vulnerabilities.length,
        criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
        highCount: vulnerabilities.filter(v => v.severity === 'high').length,
        mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
        lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
      };
      
      // Update scan record with results
      await Scan.findOneAndUpdate(
        { scanId, userId },
        {
          status: 'completed',
          progress: 100,
          vulnerabilities: vulnerabilities.length,
          summary
        }
      );
      
      // Save vulnerabilities to database
      for (const vuln of vulnerabilities) {
        const newVulnerability = new Vulnerability({
          vulnerabilityId: vuln.id,
          scanId,
          userId,
          type: vuln.type,
          severity: vuln.severity,
          location: vuln.location,
          description: vuln.description,
          code: vuln.code,
          suggestedFix: vuln.suggestedFix,
          status: 'open',
          createdAt: new Date(),
          repo: repositoryUrl,
        });
        
        await newVulnerability.save();
      }
      
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
      
    } catch (error) {
      console.error('Scan process error:', error);
      
      // Mark scan as failed
      await Scan.findOneAndUpdate(
        { scanId, userId },
        {
          status: 'failed',
          progress: 0
        }
      );
      
      // Clean up temp directory if it exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
    
  } catch (error) {
    console.error('Scan background process error:', error);
    
    // Mark scan as failed
    await Scan.findOneAndUpdate(
      { scanId, userId },
      {
        status: 'failed',
        progress: 0
      }
    );
  }
}

// Apply fixes to file
app.post('/api/scan/:scanId/apply-fixes', authenticateToken, async (req, res) => {
  try {
    const { scanId } = req.params;
    const { fileName, vulnerabilities } = req.body;
    const userId = req.user.id;
    
    // Verify that this scan belongs to the user
    const Scan = mongoose.model('Scan');
    const scan = await Scan.findOne({ scanId, userId });
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }
    
    // Create a temporary directory to clone the repo
    const tempDir = path.join(os.tmpdir(), `fix-${scanId}`);
    
    try {
      // First create the directory
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Clone the repository
      await new Promise((resolve, reject) => {
        exec(`git clone --depth 1 --branch ${scan.branch || 'main'} ${scan.repositoryUrl} ${tempDir}`, (error) => {
          if (error) {
            console.error('Clone error:', error);
            reject(new Error(`Failed to clone repository: ${error.message}`));
            return;
          }
          resolve();
        });
      });
      
      // Read the file content
      const fullPath = path.join(tempDir, fileName);
      let originalCode = '';
      
      try {
        originalCode = fs.readFileSync(fullPath, 'utf8');
      } catch (error) {
        console.error('File read error:', error);
        return res.status(404).json({ message: 'File not found in repository' });
      }
      
      // Make a copy of the original code
      let fixedCode = originalCode;
      
      // Apply fixes by replacing vulnerable lines with fixed code
      // Sort vulnerabilities by line number in descending order to avoid offset issues
      const sortedVulnerabilities = [...vulnerabilities].sort((a, b) => b.lineNumber - a.lineNumber);
      
      for (const vuln of sortedVulnerabilities) {
        // Split code into lines
        const lines = fixedCode.split('\n');
        
        // Line numbers in editor are 1-indexed but arrays are 0-indexed
        const lineIndex = vuln.lineNumber - 1;
        
        if (lineIndex >= 0 && lineIndex < lines.length) {
          // Replace the vulnerable line with the fix
          lines[lineIndex] = vuln.fix;
          
          // Join the lines back together
          fixedCode = lines.join('\n');
        }
      }
      
      // Return the original and fixed code
      res.status(200).json({
        fileName,
        originalCode,
        fixedCode
      });
      
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
      
    } catch (error) {
      console.error('Fix application error:', error);
      
      // Clean up temp directory if it exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      
      return res.status(500).json({ message: 'Failed to apply fixes: ' + error.message });
    }
    
  } catch (error) {
    console.error('Fix application error:', error);
    res.status(500).json({ message: 'Server error while applying fixes' });
  }
});

// Get scan status endpoint
app.get('/api/scan/repository/:scanId/status', authenticateToken, async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;
    
    // Find the scan
    const Scan = mongoose.model('Scan');
    const scan = await Scan.findOne({ scanId, userId });
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }
    
    res.status(200).json({
      status: scan.status,
      progress: scan.progress
    });
  } catch (error) {
    console.error('Scan status error:', error);
    res.status(500).json({ message: 'Failed to get scan status' });
  }
});

// Get scan results endpoint
app.get('/api/scan/repository/:scanId/results', authenticateToken, async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;
    
    // Find the scan
    const Scan = mongoose.model('Scan');
    const scan = await Scan.findOne({ scanId, userId });
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }
    
    // Find vulnerabilities for this scan
    const Vulnerability = mongoose.model('Vulnerability');
    const vulnerabilities = await Vulnerability.find({ scanId, userId });
    
    // Format the response
    const result = {
      id: scan.scanId,
      repositoryUrl: scan.repositoryUrl,
      branch: scan.branch || 'main',
      timestamp: scan.timestamp,
      status: scan.status,
      vulnerabilities: vulnerabilities.map(vuln => ({
        id: vuln.vulnerabilityId,
        type: vuln.type,
        severity: vuln.severity,
        location: vuln.location,
        description: vuln.description,
        code: vuln.code,
        suggestedFix: vuln.suggestedFix,
        status: vuln.status,
        createdAt: vuln.createdAt,
      })),
      summary: scan.summary
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Scan results error:', error);
    res.status(500).json({ message: 'Failed to get scan results' });
  }
});

// Upload and scan a file directly
app.post('/api/scan/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const language = req.body.language || 'javascript';
    const userId = req.user.id;

    // Read the file
    let code;
    try {
      code = fs.readFileSync(filePath, 'utf8');
      if (!code || code.trim().length === 0) {
        throw new Error('File is empty');
      }
    } catch (error) {
      console.error('File read error:', error);
      return res.status(400).json({ message: 'Failed to read file: ' + error.message });
    }
    
    // Scan the code using the security scanner
    const scanResult = await securityScanner.scanCode(code, language);
    
    // Create a scan record in MongoDB
    const scanId = crypto.randomBytes(16).toString('hex');
    const Scan = mongoose.model('Scan');
    
    const newScan = new Scan({
      scanId,
      userId,
      repositoryUrl: req.file.originalname,
      status: 'completed',
      progress: 100,
      timestamp: new Date(),
      vulnerabilities: scanResult.vulnerabilities.length,
      summary: {
        totalVulnerabilities: scanResult.vulnerabilities.length,
        criticalCount: scanResult.vulnerabilities.filter(v => v.severity === 'critical').length,
        highCount: scanResult.vulnerabilities.filter(v => v.severity === 'high').length,
        mediumCount: scanResult.vulnerabilities.filter(v => v.severity === 'medium').length,
        lowCount: scanResult.vulnerabilities.filter(v => v.severity === 'low').length,
      },
      duration: '1m 30s', // Placeholder
      filesScanned: 1
    });
    
    await newScan.save();
    
    // Save vulnerabilities to MongoDB
    const Vulnerability = mongoose.model('Vulnerability');
    
    for (const vuln of scanResult.vulnerabilities) {
      // Skip "No Issues Detected" entries
      if (vuln.type === 'No Issues Detected') continue;
      
      const newVulnerability = new Vulnerability({
        vulnerabilityId: vuln.id,
        scanId,
        userId,
        type: vuln.type,
        severity: vuln.severity,
        location: {
          file: req.file.originalname,
          line: vuln.location.line,
        },
        description: vuln.description,
        code: vuln.code,
        suggestedFix: vuln.suggestedFix,
        status: 'open',
        createdAt: new Date(),
        repo: req.file.originalname,
      });
      
      await newVulnerability.save();
    }
    
    // Format the result for the frontend
    const result = {
      id: scanId,
      repositoryUrl: req.file.originalname,
      branch: 'main',
      timestamp: new Date().toISOString(),
      status: 'completed',
      vulnerabilities: scanResult.vulnerabilities
        .filter(vuln => vuln.type !== 'No Issues Detected')
        .map(vuln => ({
          id: vuln.id,
          type: vuln.type,
          severity: vuln.severity,
          location: {
            file: req.file.originalname,
            line: vuln.location.line,
          },
          description: vuln.description,
          code: vuln.code,
          suggestedFix: vuln.suggestedFix,
          status: 'open',
          createdAt: new Date().toISOString(),
        })),
      summary: {
        totalVulnerabilities: scanResult.vulnerabilities.filter(vuln => vuln.type !== 'No Issues Detected').length,
        criticalCount: scanResult.vulnerabilities.filter(v => v.severity === 'critical' && v.type !== 'No Issues Detected').length,
        highCount: scanResult.vulnerabilities.filter(v => v.severity === 'high' && v.type !== 'No Issues Detected').length,
        mediumCount: scanResult.vulnerabilities.filter(v => v.severity === 'medium' && v.type !== 'No Issues Detected').length,
        lowCount: scanResult.vulnerabilities.filter(v => v.severity === 'low' && v.type !== 'No Issues Detected').length,
      }
    };
    
    // Delete the uploaded file after processing
    fs.unlinkSync(filePath);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('File scan error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Server error during file scan' });
  }
});

// Get User Dashboard Data endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get scan history
    const Scan = mongoose.model('Scan');
    const scans = await Scan.find({ userId }).sort({ timestamp: -1 });
    
    // Get vulnerabilities
    const Vulnerability = mongoose.model('Vulnerability');
    const vulnerabilities = await Vulnerability.find({ userId });
    
    // Count repositories
    const uniqueRepos = [...new Set(scans.map(scan => scan.repositoryUrl))];
    
    // Calculate dashboard data
    const dashboardData = {
      activeRepositories: uniqueRepos.length,
      openVulnerabilities: vulnerabilities.filter(v => v.status === 'open').length,
      recentScansCount: scans.length,
      fixedIssues: vulnerabilities.filter(v => v.status === 'fixed').length,
      recentScans: scans.slice(0, 5).map((scan, index) => ({
        id: index + 1,
        repo: scan.repositoryUrl.split('/').pop(),
        date: scan.timestamp.toISOString(),
        issues: scan.vulnerabilities
      })),
      topVulnerabilities: vulnerabilities
        .sort((a, b) => {
          const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 5)
        .map(vuln => ({
          id: vuln.vulnerabilityId,
          type: vuln.type,
          severity: vuln.severity,
          location: `${vuln.location.file}:${vuln.location.line}`
        }))
    };
    
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get scan history endpoint
app.get('/api/scan-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get scan history
    const Scan = mongoose.model('Scan');
    const scans = await Scan.find({ userId, status: 'completed' }).sort({ timestamp: -1 });
    
    // Format response
    const scanHistory = await Promise.all(scans.map(async (scan) => {
      // Find vulnerabilities for this scan
      const Vulnerability = mongoose.model('Vulnerability');
      const vulnerabilities = await Vulnerability.find({ scanId: scan.scanId });
      
      return {
        id: scan.scanId,
        repositoryUrl: scan.repositoryUrl,
        branch: scan.branch || 'main',
        timestamp: scan.timestamp.toISOString(),
        status: scan.status,
        summary: scan.summary || {
          totalVulnerabilities: vulnerabilities.length,
          criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
          highCount: vulnerabilities.filter(v => v.severity === 'high').length,
          mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
          lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
        }
      };
    }));
    
    res.status(200).json(scanHistory);
  } catch (error) {
    console.error('Scan history error:', error);
    res.status(500).json({ message: 'Server error fetching scan history' });
  }
});

// Create MongoDB schema for Scan if it doesn't exist
if (!mongoose.models.Scan) {
  const scanSchema = new mongoose.Schema({
    scanId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    repositoryUrl: { type: String, required: true },
    branch: { type: String },
    status: { type: String, enum: ['initiated', 'processing', 'completed', 'failed'], required: true },
    progress: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    vulnerabilities: { type: Number, default: 0 },
    summary: {
      totalVulnerabilities: { type: Number, default: 0 },
      criticalCount: { type: Number, default: 0 },
      highCount: { type: Number, default: 0 },
      mediumCount: { type: Number, default: 0 },
      lowCount: { type: Number, default: 0 },
    },
    duration: { type: String },
    filesScanned: { type: Number, default: 0 }
  });
  
  mongoose.model('Scan', scanSchema);
}

// Create MongoDB schema for Vulnerability if it doesn't exist
if (!mongoose.models.Vulnerability) {
  const vulnerabilitySchema = new mongoose.Schema({
    vulnerabilityId: { type: String, required: true },
    scanId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    location: {
      file: { type: String, required: true },
      line: { type: Number, required: true },
      column: { type: Number }
    },
    description: { type: String, required: true },
    code: { type: String },
    suggestedFix: { type: String },
    status: { type: String, enum: ['open', 'fixed', 'ignored'], default: 'open' },
    createdAt: { type: Date, default: Date.now },
    repo: { type: String }
  });
  
  mongoose.model('Vulnerability', vulnerabilitySchema);
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
