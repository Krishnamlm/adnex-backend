const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
// const googleAuthController = require('../controllers/googleAuthController'); // Assuming googleAuthController has a direct method, otherwise integrate its logic
const isAuthenticated = require('../middleware/isAuthenticated');
const { sendEmail } = require('../utils/sendEmail');

// Helper function for Google Callback (can be moved to googleAuthController.js if preferred)
const handleGoogleCallback = async (req, res, next) => { // Added 'next'
    try {
        // IMPORTANT: Add a check for isVerified for Google login as well
        if (!req.user || !req.user.isVerified) { // Check if req.user exists before accessing isVerified
            req.logout((err) => { // Added 'err' callback
                if (err) { console.error('Logout error during unverified Google login:', err); return next(err); } // Pass error to next
                req.session.email = req.user ? req.user.email : ''; // Store email for OTP verification (handle req.user possibly null)
                // Corrected redirect for verify-otp if it's on frontend
                return res.redirect(process.env.FRONTEND_URL + '/verify-otp.html?error=not_verified_google');
            });
            return;
        }

        // ✅ Send welcome email
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

        // ✅ Redirect to saved page or home
        const redirectUrl = req.session.returnTo || process.env.FRONTEND_URL + '/index.html'; // Default to frontend home
        delete req.session.returnTo; // Clean up session
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
    failureRedirect: process.env.FRONTEND_URL + '/login.html?login=error', // Redirect on failure
    failureFlash: false
}), (req, res) => { // Added a direct callback here instead of authController.login
    // This code runs ONLY on successful local authentication
    // Passport has already established the session (req.login() was called internally)

    // Optional: Send welcome email for local login if you want
    // const subject = '✅ You’ve Signed In to Adnex Technologies!';
    // const html = `<div style="padding:20px;font-family:sans-serif;"><h2>Welcome, ${req.user.username}!</h2><p>You’ve successfully logged in.</p><p>Thanks for joining Adnex Technologies 🚀</p></div>`;
    // sendEmail({ to: req.user.email, subject, html }).catch(console.error);

    // Redirect to the appropriate frontend page after successful login
    const redirectUrl = req.session.returnTo || process.env.FRONTEND_URL + '/index.html';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: process.env.FRONTEND_URL + '/login.html?login=google_error' }), handleGoogleCallback); // Use the new handler

// Logout route
router.get('/logout', (req, res, next) => { // Added 'next'
    req.logout((err) => {
        if (err) { console.error('Logout error:', err); return next(err); } // Pass error to next
        req.session.destroy(() => {
            res.redirect(process.env.FRONTEND_URL + '/login.html?loggedout=true');
        });
    });
});

module.exports = router;
