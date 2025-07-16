const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

// Define your frontend and backend URLs here
// IMPORTANT: Make sure these are set as environment variables on Render!
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://adnex-frontend-ui2a.onrender.com'; // Your deployed Render frontend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://adnex-backend.onrender.com'; // Your deployed Render backend URL

// Create a transporter for nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,         // your email
        pass: process.env.EMAIL_PASS          // your email password or app password
    }
});

// Send OTP to user email
const sendOTP = async (email, otp) => {
    await transporter.sendMail({
        from: `"AdNex Technologies" <${process.env.EMAIL_USER}>`, // Consistent sender name
        to: email,
        subject: "OTP Verification - AdNex Technologies", // More descriptive subject
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account - AdNex Technologies</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap'); /* Using Google Fonts for a modern look */

        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f7f9fc; /* Light background for contrast */
            -webkit-text-size-adjust: none; /* Prevent text size adjustment on mobile */
            color: #333333;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        td {
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); /* Soft shadow */
        }
        .header {
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); /* Vibrant gradient */
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
            line-height: 1.8;
            color: #555555;
        }
        .content p {
            margin-bottom: 25px;
            font-size: 16px;
        }
        .otp-box {
            background-color: #e0f2f7; /* Light blue background for OTP */
            border: 2px dashed #00bcd4; /* Dotted border */
            border-radius: 8px;
            padding: 20px 30px;
            margin: 30px auto;
            width: fit-content;
            display: inline-block;
        }
        .otp-box h2 {
            margin: 0;
            font-size: 48px;
            font-weight: 700;
            color: #00838f; /* Darker blue for OTP */
            letter-spacing: 5px;
        }
        .footer {
            background-color: #f0f4f7;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #777777;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
        }
        .footer p {
            margin: 0 0 10px;
        }
        .footer a {
            color: #2575fc;
            text-decoration: none;
            font-weight: 600;
        }
        .footer a:hover {
            text-decoration: underline;
        }

        /* Responsive adjustments */
        @media only screen and (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
                box-shadow: none;
            }
            .header, .content, .footer {
                padding: 25px 20px;
            }
            .header h1 {
                font-size: 28px;
            }
            .content p {
                font-size: 15px;
            }
            .otp-box h2 {
                font-size: 38px;
            }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td align="center">
                <div class="container">
                    <div class="header">
                        <h1>Verify Your Account</h1>
                        <p style="font-size: 18px; margin-top: 10px; opacity: 0.9;">Secure your access to AdNex Technologies</p>
                    </div>

                    <div class="content">
                        <p>Hi there,</p>
                        <p>You recently requested to log in or create an account for <strong>AdNex Technologies</strong>. Please use the following One-Time Password (OTP) to complete your verification:</p>

                        <div class="otp-box">
                            <h2>${otp}</h2> </div>

                        <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.</p>

                        <p>If you did not request this, please ignore this email or contact our support team immediately.</p>
                    </div>

                    <div class="footer">
                        <p>&copy; 2025 AdNex Technologies. All rights reserved.</p>
                        <p>You received this email because you initiated an action on AdNex Technologies.</p>
                        <p><a href="https://adnextechnologies.in">Privacy Policy</a> | <a href="https://adnextechnologies.in">Terms of Service</a></p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`
    });
};

// ----------------------- REGISTER -----------------------

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            // Redirect to frontend's register page with an error parameter
            return res.redirect(`${FRONTEND_URL}/register.html?error=email_exists`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            otp,
            otpExpires
        });

        await newUser.save();
        await sendOTP(email, otp);

        // Save email in session for OTP verification
        req.session.email = email;

        // Redirect to frontend's OTP page with a success message
        return res.redirect(`${FRONTEND_URL}/verify-otp.html?otp_sent=success`);

    } catch (err) {
        console.error('Registration error:', err);
        // If there's a server error during initial registration (before OTP)
        // Redirect to frontend's register page with a general error
        return res.redirect(`${FRONTEND_URL}/register.html?registration=error`);
    }
};

// ----------------------- VERIFY OTP -----------------------
exports.verifyOtp = async (req, res) => {
    const { otp } = req.body;
    const email = req.session.email;

    try {
        if (!email) {
            // Redirect to frontend's login page if session email is missing
            return res.redirect(`${FRONTEND_URL}/login.html?registration=error_session`);
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Redirect to frontend's login page if user not found (unlikely after session check)
            return res.redirect(`${FRONTEND_URL}/login.html?registration=error_user_not_found`);
        }

        if (user.otp !== otp || user.otpExpires < new Date()) {
            // Redirect back to frontend's verify-otp page with error
            return res.redirect(`${FRONTEND_URL}/verify-otp.html?error=invalid_otp`);
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Clear session email
        req.session.email = null;

        // Redirect to frontend's login page with success parameter
        return res.redirect(`${FRONTEND_URL}/login.html?registration=success`);

    } catch (err) {
        console.error('OTP verification error:', err);
        // Server error during OTP verification, redirect to frontend login
        return res.redirect(`${FRONTEND_URL}/login.html?registration=error`);
    }
};

// ----------------------- LOGIN -----------------------
exports.login = async (req, res) => {
    // Passport has already authenticated the user and populated req.user
    // If we reach this point, authentication was successful.
    // The user object is available via req.user

    try {
        // IMPORTANT: Add a check for isVerified here
        if (!req.user.isVerified) {
            // If user is not verified, log them out and redirect to OTP verification
            req.logout((err) => {
                if (err) { console.error('Logout error during unverified login:', err); }
                req.session.email = req.user.email; // Store email for OTP verification
                // Redirect to frontend's verify-otp page
                return res.redirect(`${FRONTEND_URL}/verify-otp.html?error=not_verified`);
            });
            return;
        }

        // Send welcome email - req.user is now available from Passport
        const subject = '✅ You’ve Signed In to Adnex Technologies';
        const html = `<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
            <div style="max-width:600px;margin:30px auto;background:#fff;padding:40px;border-radius:8px;text-align:center;">
                <img src="https://adnextechnologies.in/images/logo-new.png" alt="Adnex Technologies" style="height:40px;margin-bottom:20px;">
                <h2 style="margin:0;color:#0b2161;font-size:22px;">Login Successful!</h2>
                <p style="color:#333;font-size:16px;line-height:1.5;margin:20px 0;">
                    Hey ${req.user.username}, you're now securely logged into your Adnex Technologies account.
                </p>

                <p style="font-size:16px;color:#555;line-height:1.5;">At Adnex, we specialize in:</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:20px auto;">
                    <tr>
                        <td style="padding:0 20px;">
                            <p style="font-family:Arial,sans-serif;color:#333;font-size:16px;font-weight:bold;margin-bottom:10px;">
                                At Adnex, we specialize in:
                            </p>
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
        </body>
        `;

        await sendEmail({ to: req.user.email, subject, html }); // Use req.user.email here

        // Redirect to the stored URL or default to the backend's success page
        // (Assuming /auth/success on the backend serves your main protected index.html)
        const redirectUrl = req.session.returnTo || `${BACKEND_URL}/auth/success`;

        delete req.session.returnTo; // Clear the stored URL from session
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error('Login error:', err);
        // In case of any error during email sending or final redirect, go back to frontend login
        return res.redirect(`${FRONTEND_URL}/login.html?login=error`);
    }
};
