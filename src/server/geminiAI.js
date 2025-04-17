
/**
 * Mock implementation of Gemini AI for generating vulnerability fixes
 * In a real implementation, this would call the Gemini AI API
 */
const geminiAI = {
  /**
   * Generate a fix suggestion for a security vulnerability
   * @param {string} code - The vulnerable code snippet
   * @param {string} vulnerabilityType - The type of vulnerability
   * @returns {string} A suggested fix with explanation
   */
  generateFixSuggestion: async (code, vulnerabilityType) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return predefined fixes based on the vulnerability type
    switch (vulnerabilityType) {
      case 'SQL Injection':
        return `Use parameterized queries instead of string concatenation:

\`\`\`javascript
// VULNERABLE:
const query = \`SELECT * FROM users WHERE id = \${userId}\`;

// FIXED:
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
\`\`\`

This prevents attackers from manipulating the SQL query structure by ensuring that user input is treated as data, not executable code.`;
        
      case 'Cross-site Scripting (XSS)':
        return `Avoid directly inserting HTML from user input:

\`\`\`javascript
// VULNERABLE:
element.innerHTML = userInput;
// or
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// FIXED:
// In React:
<div>{userInput}</div>

// If HTML is necessary, sanitize it:
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
// or
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
\`\`\`

This ensures that any HTML tags in user input are escaped or properly sanitized, preventing attackers from injecting malicious scripts.`;
        
      case 'Hardcoded Secret':
        return `Move secrets to environment variables:

\`\`\`javascript
// VULNERABLE:
const API_KEY = "sk_live_abcdef123456";

// FIXED:
const API_KEY = process.env.API_KEY;
\`\`\`

Also, ensure you:
1. Don't commit .env files to your repository (add them to .gitignore)
2. Use a secrets management service for production environments
3. Rotate compromised secrets immediately`;
        
      case 'Insecure Cookie':
        return `Set the secure flag to ensure cookies are only sent over HTTPS:

\`\`\`javascript
// VULNERABLE:
res.cookie("session", token, { httpOnly: true });

// FIXED:
res.cookie("session", token, { 
  httpOnly: true, 
  secure: true,
  sameSite: 'strict' 
});
\`\`\`

This protects against:
1. Cookie theft via man-in-the-middle attacks
2. Cross-site request forgery with the sameSite flag
3. Client-side JavaScript access with httpOnly`;
        
      case 'Path Traversal':
        return `Sanitize file paths to prevent directory traversal:

\`\`\`javascript
// VULNERABLE:
fs.readFile(path + "../../../" + filename);

// FIXED:
const path = require('path');
const safePath = path.resolve(basePath, filename);

// Ensure the path is still within the allowed directory
if (!safePath.startsWith(basePath)) {
  throw new Error('Invalid file path');
}

fs.readFile(safePath);
\`\`\`

This prevents attackers from accessing files outside the intended directory by:
1. Resolving all relative path components
2. Validating the final path is within allowed boundaries
3. Rejecting suspicious file paths`;
        
      case 'Outdated Dependency':
        return `Update the vulnerable dependency to a secure version:

\`\`\`javascript
// VULNERABLE:
// package.json
"dependencies": {
  "vulnerable-package": "1.0.0"
}

// FIXED:
"dependencies": {
  "vulnerable-package": "1.2.3"
}
\`\`\`

Also consider:
1. Setting up automated dependency scanning
2. Using package-lock.json or yarn.lock for consistent installs
3. Subscribing to security advisories for critical dependencies`;
        
      case 'Command Injection':
        return `Avoid using user input directly in command execution:

\`\`\`javascript
// VULNERABLE:
exec("rm -rf " + userInput);

// FIXED:
// Use safer alternatives like specific APIs
const fs = require('fs').promises;
await fs.unlink(validatedFilePath);

// If exec is necessary, validate inputs strictly
const { execFile } = require('child_process');
const allowedCommands = ['ls', 'cat'];
if (allowedCommands.includes(command)) {
  execFile(command, [validatedArg], (error, stdout) => {
    // Handle result safely
  });
}
\`\`\`

This prevents attackers from injecting malicious commands that could execute with your application's privileges.`;
        
      default:
        return `Based on the code analysis, here's a suggested fix:

1. Validate all user inputs before processing them
2. Apply input sanitization appropriate to the context
3. Implement proper error handling to avoid information leakage
4. Follow the principle of least privilege
5. Consider using security-focused libraries for critical operations

For this specific code snippet:
\`\`\`javascript
${code}
\`\`\`

Review it carefully for potential security weaknesses related to input handling, authentication, authorization, and data protection.`;
    }
  }
};

module.exports = geminiAI;
