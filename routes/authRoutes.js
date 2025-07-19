// adnex-backend/routes/authRoutes.js

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { sendEmail } = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

// --- JWT Configuration ---
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';

// Helper function to generate a JWT
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Helper function for Google Callback
const handleGoogleCallback = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isVerified) {
            req.logout((err) => {
                if (err) { console.error('Logout error during unverified Google login:', err); return next(err); }
                req.session.email = req.user ? req.user.email : '';
                // MODIFIED: Use FRONTEND_URL
                return res.redirect(`${process.env.FRONTEND_URL}/verify-otp.html?error=not_verified_google`);
            });
            return;
        }

        const token = generateToken(req.user.id);

        const subject = '✅ You’ve Signed In to Adnex Technologies (via Google)';
        const html = `<div style="padding:20px;font-family:sans-serif;"><h2>Welcome, ${req.user.username}!</h2><p>You’ve successfully logged in using your Google account.</p><p>Thanks for joining Adnex Technologies 🚀</p></div>`;
        await sendEmail({ to: req.user.email, subject, html });

        // MODIFIED: Use FRONTEND_URL
        return res.redirect(`${process.env.FRONTEND_URL}/auth-success.html#token=${token}`);

    } catch (err) {
        console.error('Error during Google login callback:', err);
        // MODIFIED: Use FRONTEND_URL
        return res.redirect(`${process.env.FRONTEND_URL}/login.html?login=google_error`);
    }
};

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);

router.post('/login', passport.authenticate('local', {
    // MODIFIED: Use FRONTEND_URL
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?login=error`,
    failureFlash: false
}), async (req, res) => {
    try {
        if (req.user && req.user.isVerified) {
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

    // MODIFIED: Use FRONTEND_URL
    return res.redirect(`${process.env.FRONTEND_URL}/auth-success.html#token=${token}`);
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { 
    // MODIFIED: Use FRONTEND_URL
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?login=google_error` 
}), handleGoogleCallback);

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { console.error('Logout error:', err); return next(err); }
        req.session.destroy(() => {
            // MODIFIED: Use FRONTEND_URL
            res.redirect(`${process.env.FRONTEND_URL}/login.html?loggedout=true`);
        });
    });
});

module.exports = router;
