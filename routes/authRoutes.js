const express = require('express');
const path = require('path'); // You might not need path if not serving local files
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const isAuthenticated = require('../middleware/isAuthenticated');
const { sendEmail } = require('../utils/sendEmail');


exports.googleCallback = async (req, res) => {
    try {
        // IMPORTANT: Add a check for isVerified for Google login as well
        if (!req.user.isVerified) {
            req.logout((err) => {
                if (err) { console.error('Logout error during unverified Google login:', err); }
                req.session.email = req.user.email; // Store email for OTP verification
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
    // These failureRedirects should also point to the frontend
    failureRedirect: process.env.FRONTEND_URL + '/login.html?login=error', // Redirect on failure
    failureFlash: false
}), authController.login); // authController.login will now only handle email sending and redirection

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: process.env.FRONTEND_URL + '/login.html?login=google_error' }), exports.googleCallback); // Use exports.googleCallback

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy(() => {
            // Redirect to frontend's login page after logout
            res.redirect(process.env.FRONTEND_URL + '/login.html?loggedout=true');
        });
    });
});

module.exports = router;
