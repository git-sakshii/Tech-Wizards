
// This is a mock email service
// In a real application, you would use a service like Nodemailer, SendGrid, etc.

const sendOtpEmail = async (email, otp) => {
  // In a real application, send an actual email
  console.log(`Sending OTP ${otp} to ${email}`);
  
  // For development/testing purposes, we'll just log the OTP
  // and pretend we've sent the email
  return Promise.resolve({
    success: true,
    message: `OTP ${otp} sent to ${email}`,
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  // In a real application, you would send an actual email with a link
  // containing the reset token
  console.log(`Sending password reset token ${resetToken} to ${email}`);
  
  // For development/testing purposes, we'll just log the token
  // and pretend we've sent the email
  return Promise.resolve({
    success: true,
    message: `Password reset token ${resetToken} sent to ${email}`,
  });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail };
