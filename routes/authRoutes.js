const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const isAuthenticated = require('../middleware/isAuthenticated');
const { sendEmail } = require('../utils/sendEmail');

// IMPORTANT: Ensure FRONTEND_URL and BACKEND_URL are defined in .env
// and correctly loaded in server.js or a config file accessible here.
// For safety, you can add them here as well if they aren't globally available
// via process.env in this file consistently (though they should be if dotenv is setup correctly).
// const FRONTEND_URL = process.env.FRONTEND_URL || 'https://adnextechnologies.in';
// const BACKEND_URL = process.env.BACKEND_URL || 'https://api.adnextechnologies.in';

// Helper function for Google Callback
const handleGoogleCallback = async (req, res, next) => {
    try {
        // IMPORTANT: Add a check for isVerified for Google login as well
        if (!req.user || !req.user.isVerified) {
            req.logout((err) => {
                if (err) { console.error('Logout error during unverified Google login:', err); return next(err); }
                req.session.email = req.user ? req.user.email : '';
                return res.redirect(process.env.FRONTEND_URL + '/verify-otp.html?error=not_verified_google');
            });
            return;
        }

        // ✅ Send welcome email (as implemented)
        const subject = '✅ You’ve Signed In to Adnex Technologies (via Google)';
        const html = `
            <div style="padding:20px;font-family:sans-serif;">
                <h2>Welcome, ${req.user.username}!</h2>
                <p>You’ve successfully logged in using your Google account.</p>
                <p>Thanks for joining Adnex Technologies 🚀</p>
            </div>
        `;

        await sendEmail({
            to: req.user.email,
            subject,
            html
        });

        // ✅ CRITICAL FIX: Redirect to the BACKEND protected page
        // Use BACKEND_URL, not FRONTEND_URL, for the post-login redirect.
        const redirectUrl = req.session.returnTo || process.env.BACKEND_URL + '/contact';
        delete req.session.returnTo;
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error('Error during Google login callback:', err);
        return res.redirect(process.env.FRONTEND_URL + '/login.html?login=google_error'); // Redirect to frontend login on error
    }
};

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
}), (req, res) => {
    // This code runs ONLY on successful local authentication
    const redirectUrl = req.session.returnTo || process.env.BACKEND_URL + '/contact'; // ALSO changed this to BACKEND_URL
    delete req.session.returnTo;
    res.redirect(redirectUrl);
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
