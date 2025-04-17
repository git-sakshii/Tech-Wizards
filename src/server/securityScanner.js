const crypto = require('crypto');

// Define vulnerable functions and secure alternatives
const vulnerableFunctions = {
  'eval': {
    severity: 'critical',
    description: 'Use of eval() function which can execute arbitrary code',
    suggestion: 'Avoid using eval() completely. Use safer alternatives like Function constructors or JSON.parse() if parsing JSON.'
  },
  'exec': {
    severity: 'critical',
    description: 'Use of exec() which can execute arbitrary code',
    suggestion: 'Avoid using exec(). Consider safer logic or specific APIs.'
  },
  'child_process.exec': {
    severity: 'critical',
    description: 'Use of child_process.exec() with potential command injection',
    suggestion: 'Use child_process.spawn() with proper input validation instead.'
  },
  'fs.readFile': {
    severity: 'high',
    description: 'Potential path traversal in file reading',
    suggestion: 'Validate and sanitize file paths. Use path.resolve() to ensure the path stays within the intended directory.'
  },
  'JSON.parse': {
    severity: 'medium',
    description: 'Potential unsafe JSON parsing',
    suggestion: 'Validate JSON input before parsing. Consider using a schema validator.'
  },
  'crypto.createHash': {
    severity: 'high',
    description: 'Use of potentially weak hashing algorithm',
    suggestion: 'Use stronger hashing algorithms like SHA-256 or bcrypt for security-critical operations.'
  },
  'Math.random': {
    severity: 'high',
    description: 'Use of Math.random() for security-critical operations',
    suggestion: 'Use crypto.randomBytes() or crypto.randomInt() for security-critical randomness.'
  }
};

// Define regex patterns for common vulnerabilities
const regexPatterns = [
  {
    pattern: /password\s*=\s*['"].+['"]/i,
    type: 'Hardcoded Secret',
    severity: 'critical',
    description: 'Hardcoded password detected',
    suggestion: 'Store passwords in environment variables or secure vault.'
  },
  {
    pattern: /API_KEY\s*=\s*['"].+['"]/i,
    type: 'Hardcoded Secret',
    severity: 'critical',
    description: 'Hardcoded API key detected',
    suggestion: 'Use environment variables or secure vault for API keys.'
  },
  {
    pattern: /secret\s*=\s*['"].+['"]/i,
    type: 'Hardcoded Secret',
    severity: 'critical',
    description: 'Hardcoded secret token detected',
    suggestion: 'Move secrets to environment variables or secure vault.'
  },
  {
    pattern: /open\s*\(.+,\s*['"]w['"]\)/i,
    type: 'File Operation',
    severity: 'high',
    description: 'File opened in write mode without proper validation',
    suggestion: 'Ensure file permissions and validate path before writing.'
  },
  {
    pattern: /SELECT.*FROM.*WHERE.*['"]\s*\+\s*req\.body/i,
    type: 'SQL Injection',
    severity: 'critical',
    description: 'SQL injection vulnerability detected',
    suggestion: 'Use parameterized queries or prepared statements instead of string concatenation.'
  },
  {
    pattern: /exec\(.*req\.body/i,
    type: 'Command Injection',
    severity: 'critical',
    description: 'Command injection vulnerability detected',
    suggestion: 'Avoid using user input directly in command execution. Use proper input validation.'
  }
];

const securityScanner = {
  scanCode: async (code, language = 'javascript') => {
    if (!code) {
      throw new Error('No code provided for scanning');
    }
    
    const vulnerabilities = [];
    
    // Check for vulnerable function calls
    for (const [funcName, details] of Object.entries(vulnerableFunctions)) {
      const pattern = new RegExp(`${funcName}\\(`, 'g');
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        vulnerabilities.push({
          id: crypto.randomBytes(8).toString('hex'),
          type: 'Dangerous Function',
          severity: details.severity,
          location: { line: lineNumber },
          description: details.description,
          code: code.split('\n')[lineNumber - 1],
          suggestedFix: details.suggestion
        });
      }
    }
    
    // Check for regex patterns
    for (const pattern of regexPatterns) {
      const regex = new RegExp(pattern.pattern, 'g');
      let match;
      while ((match = regex.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        vulnerabilities.push({
          id: crypto.randomBytes(8).toString('hex'),
          type: pattern.type,
          severity: pattern.severity,
          location: { line: lineNumber },
          description: pattern.description,
          code: code.split('\n')[lineNumber - 1],
          suggestedFix: pattern.suggestion
        });
      }
    }
    
    // Check for path traversal
    if (code.match(/\.\.\/\.\./i)) {
      const lineNumber = code.split('\n').findIndex(line => line.match(/\.\.\/\.\./i)) + 1;
      vulnerabilities.push({
        id: crypto.randomBytes(8).toString('hex'),
        type: 'Path Traversal',
        severity: 'high',
        location: { line: lineNumber },
        description: 'Path traversal vulnerability detected',
        code: code.split('\n')[lineNumber - 1],
        suggestedFix: 'Validate and sanitize file paths. Use path.resolve() to ensure the path stays within the intended directory.'
      });
    }
    
    // Check for XSS vulnerabilities
    if (code.includes('innerHTML') || code.includes('dangerouslySetInnerHTML')) {
      const lineNumber = code.split('\n').findIndex(line => line.includes('innerHTML') || line.includes('dangerouslySetInnerHTML')) + 1;
      vulnerabilities.push({
        id: crypto.randomBytes(8).toString('hex'),
        type: 'Cross-site Scripting (XSS)',
        severity: 'high',
        location: { line: lineNumber },
        description: 'Potential XSS vulnerability due to unfiltered HTML being rendered',
        code: code.split('\n')[lineNumber - 1],
        suggestedFix: 'Use textContent instead of innerHTML. If HTML rendering is necessary, sanitize the HTML first with a library like DOMPurify.'
      });
    }
    
    return {
      scanId: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date().toISOString(),
      language,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : [{
        id: crypto.randomBytes(8).toString('hex'),
        type: 'No Issues Detected',
        severity: 'low',
        location: { line: 1 },
        description: 'No security issues were detected in the provided code.',
        code: code.split('\n')[0],
        suggestedFix: 'Code appears secure based on the automated scan. Continue following security best practices.'
      }],
      summary: {
        totalVulnerabilities: vulnerabilities.length,
        criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
        highCount: vulnerabilities.filter(v => v.severity === 'high').length,
        mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
        lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
      }
    };
  }
};

module.exports = securityScanner;
