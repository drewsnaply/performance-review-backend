const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // e.g., 'gmail', 'SendGrid', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send welcome email with password setup link
const sendWelcomeEmail = async (user, resetToken) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://performance-review-frontend.onrender.com';
  const setupUrl = `${baseUrl}/setup-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Performance Review System" <noreply@example.com>',
    to: user.email,
    subject: 'Welcome to Performance Review System - Account Setup',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Welcome to the Performance Review System</h2>
        <p>Hello ${user.firstName || user.username},</p>
        <p>Your account has been created with the following details:</p>
        <ul>
          <li><strong>Username:</strong> ${user.username}</li>
          <li><strong>Role:</strong> ${user.role.toUpperCase()}</li>
        </ul>
        <p>To complete your account setup, please click the button below to set your password:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${setupUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Set Your Password</a>
        </div>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you did not request this account, please contact your administrator.</p>
        <p>Thank you,<br>Performance Review System Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail
};