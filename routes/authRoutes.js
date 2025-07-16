const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController'); // Still need for register, verify, etc.
// const googleAuthController = require('../controllers/googleAuthController');
const isAuthenticated = require('../middleware/isAuthenticated');
const { sendEmail } = require('../utils/sendEmail');

// ... (handleGoogleCallback function as defined in previous authRoutes.js correction) ...

// CORRECTED: GET registration page - REDIRECT to frontend
router.get('/register', (req, res) => {
    res.redirect(process.env.FRONTEND_URL + '/register.html');
});

// POST registration form submission
router.post('/register', authController.register);

// CORRECTED: GET verify OTP page - REDIRECT to frontend
router.get('/verify-otp', (req, res) => {
    res.redirect(process.env.FRONTEND_URL + '/verify-otp.html' + (req.query.email ? `?email=${req.query.email}` : ''));
});

// POST OTP verification
router.post('/verify-otp', authController.verifyOtp);

// ✨ CRITICAL FIX: GET login page - REDIRECT to frontend's login.html ✨
router.get('/login', (req, res) => {
    res.redirect(process.env.FRONTEND_URL + '/login.html' + (req.query.login ? `?login=${req.query.login}` : ''));
});

// MODIFIED: POST login form submission using Passport's local strategy
router.post('/login', passport.authenticate('local', {
    failureRedirect: process.env.FRONTEND_URL + '/login.html?login=error',
    failureFlash: false
}), async (req, res, next) => { // Make it async to use await for sendEmail
    try {
        // --- Logic from authController.login moved here ---
        if (!req.user.isVerified) {
            req.logout((err) => { // Added 'err' parameter
                if (err) { console.error('Logout error during unverified login:', err); return next(err); } // Pass error to next
                req.session.email = req.user.email;
                return res.redirect(`${process.env.FRONTEND_URL}/verify-otp.html?error=not_verified`);
            });
            return;
        }

        // Send welcome email
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
        </body>`;

        await sendEmail({ to: req.user.email, subject, html });

        // Redirect to the stored URL or default to the FRONTEND's index.html
        const redirectUrl = req.session.returnTo || `${process.env.FRONTEND_URL}/index.html`;
        delete req.session.returnTo;
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error('Login success handler error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/login.html?login=error`);
    }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: process.env.FRONTEND_URL + '/login.html?login=google_error' }), handleGoogleCallback);

// Logout route
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { console.error('Logout error:', err); return next(err); }
        req.session.destroy(() => {
            res.redirect(process.env.FRONTEND_URL + '/login.html?loggedout=true');
        });
    });
});

module.exports = router;
