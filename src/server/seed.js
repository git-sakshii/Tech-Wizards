
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('./models');

// MongoDB connection string - should match what's in server.js
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codeshield';

// Function to seed the database with sample data
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB for seeding');

    // Clear existing data
    await clearDatabase();

    // Create Scan model if it doesn't exist
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

    // Create Vulnerability model if it doesn't exist
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

    // Create test user
    const testUser = await createTestUser();

    // Create sample scans and vulnerabilities
    await createSampleScans(testUser._id);

    console.log('Database seeded successfully!');
    console.log('Demo User Credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');

    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
  }
}

// Function to clear existing data
async function clearDatabase() {
  // Only clear collections we're going to seed
  if (mongoose.models.User) await mongoose.models.User.deleteMany({});
  if (mongoose.models.Scan) await mongoose.models.Scan.deleteMany({});
  if (mongoose.models.Vulnerability) await mongoose.models.Vulnerability.deleteMany({});
  
  console.log('Cleared existing data');
}

// Function to create a test user
async function createTestUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const testUser = new User({
    name: 'Test User',
    email: 'test@example.com',
    password: hashedPassword,
    isVerified: true,
  });
  
  await testUser.save();
  console.log('Created test user');
  
  return testUser;
}

// Function to create sample scans
async function createSampleScans(userId) {
  const Scan = mongoose.model('Scan');
  const Vulnerability = mongoose.model('Vulnerability');
  
  // Sample repositories
  const repositories = [
    {
      url: 'https://github.com/sample/e-commerce-app',
      branch: 'main',
      files: ['server.js', 'routes/auth.js', 'models/user.js', 'controllers/payment.js'],
      daysAgo: 2
    },
    {
      url: 'https://github.com/sample/api-service',
      branch: 'develop',
      files: ['api/users.js', 'services/auth.js', 'middleware/validation.js'],
      daysAgo: 5
    },
    {
      url: 'https://github.com/sample/frontend-app',
      branch: 'feature/login',
      files: ['src/components/Login.jsx', 'src/services/api.js', 'src/utils/validation.js'],
      daysAgo: 8
    }
  ];
  
  // Sample vulnerability types
  const vulnerabilityTypes = [
    {
      type: 'SQL Injection',
      severity: 'critical',
      description: 'User input is directly concatenated into SQL query without proper sanitization.',
      code: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
      suggestedFix: 'const query = \'SELECT * FROM users WHERE id = ?\';\nconst result = await db.query(query, [userId]);'
    },
    {
      type: 'Cross-site Scripting (XSS)',
      severity: 'high',
      description: 'User-provided data is rendered directly in HTML without sanitization.',
      code: 'element.innerHTML = userProvidedData;',
      suggestedFix: 'import DOMPurify from \'dompurify\';\nelement.innerHTML = DOMPurify.sanitize(userProvidedData);'
    },
    {
      type: 'Hardcoded Secret',
      severity: 'high',
      description: 'API key is hardcoded directly in the source code.',
      code: 'const API_KEY = "1a2b3c4d5e6f7g8h9i0j";',
      suggestedFix: 'const API_KEY = process.env.API_KEY;'
    },
    {
      type: 'Insecure Cookie',
      severity: 'medium',
      description: 'Cookie is created without the secure flag, making it vulnerable to MITM attacks.',
      code: 'res.cookie("session", token, { httpOnly: true });',
      suggestedFix: 'res.cookie("session", token, { httpOnly: true, secure: true, sameSite: "strict" });'
    },
    {
      type: 'Path Traversal',
      severity: 'high',
      description: 'File path is constructed using user input without proper validation.',
      code: 'const filePath = path.join(baseDir, userInput);',
      suggestedFix: 'const filePath = path.resolve(baseDir, userInput);\nif (!filePath.startsWith(path.resolve(baseDir))) {\n  throw new Error("Invalid path");\n}'
    }
  ];
  
  for (const repo of repositories) {
    // Create a scan ID
    const scanId = crypto.randomBytes(16).toString('hex');
    
    // Randomly determine number of vulnerabilities (1-5)
    const vulnerabilityCount = Math.floor(Math.random() * 5) + 1;
    
    // Create vulnerabilities for this scan
    const vulnerabilities = [];
    const criticalCount = Math.floor(Math.random() * 2);
    const highCount = Math.floor(Math.random() * 3);
    const mediumCount = Math.floor(Math.random() * 2);
    const lowCount = Math.max(1, vulnerabilityCount - criticalCount - highCount - mediumCount);
    
    // Calculate timestamp
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - repo.daysAgo);
    
    // Create scan record
    const scanRecord = new Scan({
      scanId,
      userId,
      repositoryUrl: repo.url,
      branch: repo.branch,
      status: 'completed',
      progress: 100,
      timestamp,
      vulnerabilities: vulnerabilityCount,
      summary: {
        totalVulnerabilities: vulnerabilityCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      },
      filesScanned: repo.files.length
    });
    
    await scanRecord.save();
    
    // Create vulnerabilities
    for (let i = 0; i < vulnerabilityCount; i++) {
      // Select a random vulnerability type
      const vulnType = vulnerabilityTypes[i % vulnerabilityTypes.length];
      
      // Select a random file
      const file = repo.files[i % repo.files.length];
      
      // Create vulnerability ID
      const vulnId = crypto.randomBytes(8).toString('hex');
      
      // Determine severity based on counts
      let severity;
      if (i < criticalCount) severity = 'critical';
      else if (i < criticalCount + highCount) severity = 'high';
      else if (i < criticalCount + highCount + mediumCount) severity = 'medium';
      else severity = 'low';
      
      // Create vulnerability record
      const vulnerabilityRecord = new Vulnerability({
        vulnerabilityId: vulnId,
        scanId,
        userId,
        type: vulnType.type,
        severity,
        location: {
          file,
          line: Math.floor(Math.random() * 100) + 10,
        },
        description: vulnType.description,
        code: vulnType.code,
        suggestedFix: vulnType.suggestedFix,
        status: 'open',
        createdAt: timestamp,
        repo: repo.url,
      });
      
      await vulnerabilityRecord.save();
      vulnerabilities.push(vulnerabilityRecord);
    }
    
    console.log(`Created scan for ${repo.url} with ${vulnerabilityCount} vulnerabilities`);
  }
}

// Run seed function
seedDatabase();
