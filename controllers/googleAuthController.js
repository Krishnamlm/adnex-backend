const User = require('../models/User');
const nodemailer = require('nodemailer');
const { sendEmail } = require('../utils/sendEmail');

// Nodemailer transporter (reuse or create)
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      throw new Error('No user found in session');
    }

    // If user is not verified, redirect to OTP verification
    if (!user.isVerified) {
      req.session.email = user.email;
      return res.redirect('/auth/verify-otp');
    }

    // User is verified — create session and send welcome email
    req.session.userId = user._id;

    await sendEmail({
      to: user.email,
      subject: '✅ You’ve Signed In to Adnex Technologies',
      html: `<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
    <div style="max-width:600px;margin:30px auto;background:#fff;padding:40px;border-radius:8px;text-align:center;">
        <img src="https://adnextechnologies.in/images/logo-new.png" alt="Adnex Technologies" style="height:40px;margin-bottom:20px;">
        <h2 style="margin:0;color:#0b2161;font-size:22px;">Login Successful!</h2>
        <p style="color:#333;font-size:16px;line-height:1.5;margin:20px 0;">
            Hey ${req.user.username}, you're now securely logged into your Adnex Technologies account.
        </p>

        <p style="font-size:16px;color:#555;line-height:1.5;">At Adnex, we specialize in:</p>
<!-- Container block -->
<!-- Container for services -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:20px auto;">
    <tr>
        <td style="padding:0 20px;">
            <p style="font-family:Arial,sans-serif;color:#333;font-size:16px;font-weight:bold;margin-bottom:10px;">
                At Adnex, we specialize in:
            </p>
            <!-- Service blocks -->
            <table width="100%" cellpadding="10" cellspacing="0" border="0" style="margin-bottom:10px;background:#eef4ff;border-radius:4px;">
                <tr><td style="font-family:Arial,sans-serif;color:#0b2161;font-size:16px;">• Custom Software Development</td></tr>
            </table>
            <table width="100%" cellpadding="10" cellspacing="0" border="0" style="margin-bottom:10px;background:#eef4ff;border-radius:4px;">
                <tr><td style="font-family:Arial,sans-serif;color:#0b2161;font-size:16px;">• Web Development</td></tr>
            </table>
            <table width="100%" cellpadding="10" cellspacing="0" border="0" style="margin-bottom:10px;background:#eef4ff;border-radius:4px;">
                <tr><td style="font-family:Arial,sans-serif;color:#0b2161;font-size:16px;">• Digital Marketing Solutions</td></tr>
            </table>
            <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background:#eef4ff;border-radius:4px;">
                <tr><td style="font-family:Arial,sans-serif;color:#0b2161;font-size:16px;">• IT Domain Internships</td></tr>
            </table>
        </td>
    </tr>
</table>
        <a href="https://adnextechnologies.in/index.html" style="background:#0b2161;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">
            Explore Our Services
        </a>

        <p style="font-size:12px;color:#777;margin-top:30px;">
            © 2025 Adnex Technologies • <a href="mailto:adnextechnologies@gmail.com?subject=Adnex%20User" style="color:#0b2161;text-decoration:none;">Contact Support</a>
        </p>
    </div>
</body>`,
    });

const redirectUrl = req.session.returnTo || '/';
delete req.session.returnTo;
return res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error in googleCallback:', error);
    return res.redirect('/auth/error');
  }
};
