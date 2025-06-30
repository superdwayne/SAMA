// Add this after the existing imports at the top of server.js
const { exec } = require('child_process');
const path = require('path');

// Python email function
async function sendTokenEmailPython(email, token, region) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'send_email.py');
    const command = `python3 "${pythonScript}" "${email}" "${token}" "${region}"`;
    
    console.log(`🐍 Sending email via Python: ${email}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Python email error:', error);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error('Python email stderr:', stderr);
      }
      
      try {
        const result = JSON.parse(stdout);
        console.log('🐍 Python email result:', result);
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError);
        console.log('Raw output:', stdout);
        reject(parseError);
      }
    });
  });
}

// Updated sendTokenEmail function to use Python first
async function sendTokenEmail(email, token, region, usePython = true) {
  // Try Python email first (for testing)
  if (usePython) {
    try {
      const result = await sendTokenEmailPython(email, token, region);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.log('🐍 Python email failed, falling back to Node.js email');
    }
  }
  
  // Fallback to existing Node.js email logic
  // ... (keep existing sendTokenEmail logic here)
}