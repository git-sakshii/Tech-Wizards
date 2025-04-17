// repoScannerWithFixes.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const geminiAI = require('./geminiAI'); // Import your fix suggestion module

// Define MongoDB schemas for scan and vulnerability data
const scanSchema = new mongoose.Schema({
  scanId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repositoryUrl: { type: String, required: true },
  branch: { type: String, default: 'main' },
  status: { type: String, enum: ['initiated', 'processing', 'completed', 'failed'], default: 'initiated' },
  progress: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  commit: String,
  summary: {
    totalVulnerabilities: Number,
    criticalCount: Number,
    highCount: Number,
    mediumCount: Number,
    lowCount: Number,
  },
  duration: String,
  filesScanned: Number,
});

const vulnerabilitySchema = new mongoose.Schema({
  vulnerabilityId: { type: String, required: true, unique: true },
  scanId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  location: { file: String, line: Number, column: Number },
  description: String,
  code: String,
  suggestedFix: String,
  status: { type: String, enum: ['open', 'fixed', 'ignored'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  repo: String,
});

const Scan = mongoose.models.Scan || mongoose.model('Scan', scanSchema);
const Vulnerability = mongoose.models.Vulnerability || mongoose.model('Vulnerability', vulnerabilitySchema);

/**
 * Repository Scanner utility 
 * Connect to MongoDB via mongoose.connect(...) before using
 */
const repoScanner = {
  /**
   * Initiate a scan of a Git repository
   */
  initiateRepositoryScan: async (repositoryUrl, userId, branch = 'main') => {
    if (!repositoryUrl) throw new Error('Repository URL is required');
    if (!userId) throw new Error('User ID is required');

    const scanId = crypto.randomBytes(16).toString('hex');
    const newScan = new Scan({ scanId, userId, repositoryUrl, branch });
    await newScan.save();

    // Kick off background progress and finalization
    setTimeout(() => updateScanProgress(scanId, userId), 2000);

    return { scanId, repositoryUrl, branch, status: 'initiated', progress: 0, timestamp: new Date().toISOString() };
  },

  /**
   * Get scan status
   */
  getScanStatus: async (scanId, userId) => {
    if (!scanId || !userId) throw new Error('Scan ID and User ID are required');
    const scan = await Scan.findOne({ scanId, userId });
    if (!scan) throw new Error('Scan not found');
    return { scanId, status: scan.status, progress: scan.progress };
  },

  /**
   * Get scan results (with suggested fixes)
   */
  getScanResults: async (scanId, userId) => {
    if (!scanId || !userId) throw new Error('Scan ID and User ID are required');
    const scan = await Scan.findOne({ scanId, userId });
    if (!scan) throw new Error('Scan not found');

    const vulnerabilities = await Vulnerability.find({ scanId, userId });
    return {
      id: scan.scanId,
      repositoryUrl: scan.repositoryUrl,
      branch: scan.branch,
      commit: scan.commit,
      timestamp: scan.timestamp.toISOString(),
      status: scan.status,
      summary: scan.summary,
      vulnerabilities: vulnerabilities.map(v => ({
        id: v.vulnerabilityId,
        type: v.type,
        severity: v.severity,
        location: v.location,
        description: v.description,
        code: v.code,
        suggestedFix: v.suggestedFix,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        repo: v.repo,
      })),
    };
  },

  /**
   * Fetch and store fix suggestions for all vulnerabilities in a scan
   */
  fetchFixSuggestions: async (scanId, userId) => {
    const vulns = await Vulnerability.find({ scanId, userId, suggestedFix: { $exists: false } });
    for (let vuln of vulns) {
      try {
        const suggestion = await geminiAI.generateFixSuggestion(vuln.code, vuln.type);
        await Vulnerability.findByIdAndUpdate(vuln._id, { suggestedFix: suggestion });
      } catch (err) {
        console.error(`Failed to generate fix for ${vuln.vulnerabilityId}:`, err);
      }
    }
  },

  /**
   * Get full scan history for a user
   */
  getUserScanHistory: async (userId) => {
    if (!userId) throw new Error('User ID is required');
    const scans = await Scan.find({ userId }).sort({ timestamp: -1 });
    return scans.map(scan => ({
      id: scan.scanId,
      repositoryUrl: scan.repositoryUrl,
      branch: scan.branch,
      timestamp: scan.timestamp.toISOString(),
      status: scan.status,
      summary: scan.summary,
    }));
  },

  /**
   * User dashboard data
   */
  getUserDashboardData: async (userId) => {
    if (!userId) throw new Error('User ID is required');
    const scans = await Scan.find({ userId });
    const repos = [...new Set(scans.map(s => s.repositoryUrl))];
    const openVulns = await Vulnerability.countDocuments({ userId, status: 'open' });
    const fixedIssues = await Vulnerability.countDocuments({ userId, status: 'fixed' });
    const recentScans = await Scan.find({ userId }).sort({ timestamp: -1 }).limit(3);

    return {
      activeRepositories: repos.length,
      openVulnerabilities: openVulns,
      recentScansCount: await Scan.countDocuments({ userId, timestamp: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }),
      fixedIssues,
      recentScans: recentScans.map((scan, i) => ({ id: i+1, repo: scan.repositoryUrl.split('/').pop(), date: getRelativeTimeString(scan.timestamp), issues: scan.summary?.totalVulnerabilities || 0 })),
      topVulnerabilities: (await Vulnerability.find({ userId, status: 'open', severity: { $in: ['critical','high'] } }).sort({ severity: -1 }).limit(3))
        .map(v => ({ id: v.vulnerabilityId, type: v.type, severity: v.severity, location: v.repo })),
    };
  }
};

/**
 * Asynchronous scan progress updater
 */
async function updateScanProgress(scanId, userId) {
  try {
    let progress = 0;
    const interval = setInterval(async () => {
      progress = Math.min(100, progress + (Math.floor(Math.random()*15) + 5));
      const status = progress < 100 ? 'processing' : 'completed';
      await Scan.findOneAndUpdate({ scanId, userId }, { status, progress });
      if (progress === 100) {
        clearInterval(interval);
        await finalizeScan(scanId, userId);
      }
    }, 3000);
  } catch (err) {
    console.error('Error updating progress:', err);
    await Scan.findOneAndUpdate({ scanId, userId }, { status: 'failed' });
  }
}

/**
 * Finalize scan: generate vulnerabilities and fetch fix suggestions
 */
async function finalizeScan(scanId, userId) {
  try {
    const scan = await Scan.findOne({ scanId, userId });
    if (!scan) return;

    const seed = parseInt(scanId.slice(0, 8), 16);
    const count = (seed % 20) + 1;
    const repoName = scan.repositoryUrl.split('/').pop() || 'repo';

    // Generate vulnerabilities
    for (let i = 0; i < count; i++) {
      const types = ['SQL Injection','Cross-site Scripting (XSS)','Hardcoded Secret','Insecure Cookie','Path Traversal','Outdated Dependency','Command Injection','Unsafe Deserialization','Insecure Direct Object Reference','Sensitive Data Exposure'];
      const severityList = ['low','medium','high','critical'];
      const type = types[(seed + i) % types.length];
      const severity = severityList[(seed + i) % severityList.length];
      const location = { file: `src/${['services','controllers','utils','middlewares','models'][i%5]}/${['auth','user','data','config','api'][i%5]}.js`, line: (seed + i*11) % 200 + 1 };
      const vulnerabilityId = `vuln-${scanId.slice(0,4)}-${i}`;

      await new Vulnerability({ vulnerabilityId, scanId, userId, type, severity, location,
        description: `Potential ${type} vulnerability...`,
        code: ['const query = `SELECT * FROM users WHERE id = ${userId}`;','res.send(`<div>${userInput}</div>`);','const API_KEY = "sk_live_abcdef123456";','res.cookie("session", token, { httpOnly: true });','fs.readFile(path + "../../../" + filename);','npm install some-package@1.0.0','const obj = JSON.parse(serializedData);','exec("rm -rf " + userInput);','const userData = db.getUserById(req.params.id);','console.log("User data:", userData);'][i%10], status: i%5===0? 'fixed': 'open', createdAt: new Date(Date.now() - i*86400000), repo: repoName
      }).save();
    }

    // Update scan summary and metadata
    const vulns = await Vulnerability.find({ scanId, userId });
    const summary = {
      totalVulnerabilities: vulns.length,
      criticalCount: vulns.filter(v => v.severity==='critical').length,
      highCount: vulns.filter(v => v.severity==='high').length,
      mediumCount: vulns.filter(v => v.severity==='medium').length,
      lowCount: vulns.filter(v => v.severity==='low').length,
    };
    const duration = `${(seed%5)+1}m ${(seed%50)+10}s`;
    const filesScanned = (seed % 50) + 20;

    await Scan.findOneAndUpdate({ scanId, userId }, { status: 'completed', progress: 100, commit: scanId.slice(0,7), summary, duration, filesScanned });

    // Fetch and store fix suggestions
    await repoScanner.fetchFixSuggestions(scanId, userId);
  } catch (err) {
    console.error('Error finalizing scan:', err);
    await Scan.findOneAndUpdate({ scanId, userId }, { status: 'failed' });
  }
}

/**
 * Helper for relative time strings
 */
function getRelativeTimeString(date) {
  const diffMs = Date.now() - date;
  const secs = Math.round(diffMs/1000);
  if (secs<60) return 'just now';
  const mins = Math.round(secs/60);
  if (mins<60) return `${mins} minute${mins!==1?'s':''} ago`;
  const hrs = Math.round(mins/60);
  if (hrs<24) return `${hrs} hour${hrs!==1?'s':''} ago`;
  const days = Math.round(hrs/24);
  return days<7 ? `${days} day${days!==1?'s':''} ago` : date.toISOString().split('T')[0];
}

module.exports = repoScanner;
