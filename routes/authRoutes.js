// adnex-backend/routes/authRoutes.js

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController'); // Your auth controller
const { sendEmail } = require('../utils/sendEmail'); // Your email utility
const jwt = require('jsonwebtoken');

// --- JWT Configuration ---
const JWT_SECRET = process.env.JWT_SECRET; // Make sure this is set in your Render environment variables
const JWT_EXPIRES_IN = '1h'; // Token expiration time

// Helper function to generate a JWT
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// --- Google OAuth Callback Handler ---
const handleGoogleCallback = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isVerified) {
            req.logout((err) => {
                if (err) { console.error('Logout error during unverified Google login:', err); return next(err); }
                // Store email in session to pre-fill OTP form if desired
                if (req.user && req.user.email) {
                    req.session.email = req.user.email;
                }
                // IMPORTANT: Redirect to your FRONTEND's OTP verification page
                return res.redirect(`${process.env.FRONTEND_URL}/verify-otp.html?error=not_verified_google`);
            });
            return;
        }

        const token = generateToken(req.user.id);

        // Send a welcome email (optional)
        const subject = '✅ You’ve Signed In to Adnex Technologies (via Google)';
        const html = `<div style="padding:20px;font-family:sans-serif;"><h2>Welcome, ${req.user.username}!</h2><p>You’ve successfully logged in using your Google account.</p><p>Thanks for joining Adnex Technologies 🚀</p></div>`;
        await sendEmail({ to: req.user.email, subject, html });

        // IMPORTANT: Redirect to your FRONTEND's authentication success page with the token in hash
        return res.redirect(`${process.env.FRONTEND_URL}/auth-success.html#token=${token}`);

    } catch (err) {
        console.error('Error during Google login callback:', err);
        // IMPORTANT: Redirect to your FRONTEND's login page on error
        return res.redirect(`${process.env.FRONTEND_URL}/login.html?login=google_error`);
    }
};

// --- Routes ---
router.post('/register', authController.register); // Handles user registration
router.post('/verify-otp', authController.verifyOtp); // Handles OTP verification

router.post('/login', passport.authenticate('local', {
    // IMPORTANT: Redirect to your FRONTEND's login page on failure
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?login=error`,
    failureFlash: false // Assuming you don't use connect-flash for redirects anymore
}), async (req, res) => {
    try {
        if (req.user && req.user.isVerified) {
            // Send a welcome email after successful local login (optional)
            const subject = '✅ You’ve Signed In to Adnex Technologies (via Local Account)';
            const html = `
                <div style="padding:20px;font-family:sans-serif;">
                    <h2>Welcome back, ${req.user.username}!</h2>
                    <p>You’ve successfully logged in to your Adnex Technologies account.</p>
                </div>
            `;
            await sendEmail({
                to: req.user.email,
                subject,
                html
            });
        }
    } catch (emailErr) {
        console.error('Error sending local login welcome email:', emailErr);
    }

    const token = generateToken(req.user.id);

    // IMPORTANT: Redirect to your FRONTEND's authentication success page with the token in hash
    return res.redirect(`${process.env.FRONTEND_URL}/auth-success.html#token=${token}`);
});

// Google OAuth initiation
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// Google OAuth callback
router.get('/google/callback', passport.authenticate('google', {
    // IMPORTANT: Redirect to your FRONTEND's login page on Google auth failure
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?login=google_error`
}), handleGoogleCallback);

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { console.error('Logout error:', err); return next(err); }
        req.session.destroy(() => {
            // IMPORTANT: Redirect to your FRONTEND's login page after logout
            res.redirect(`${process.env.FRONTEND_URL}/login.html?loggedout=true`);
        });
    });
});

module.exports = router;
