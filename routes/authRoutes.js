const express = require('express');
const path = require('path');
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
                return res.redirect('/auth/verify-otp?error=not_verified_google'); // Redirect to verify OTP
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
        const redirectUrl = req.session.returnTo || '/';
        delete req.session.returnTo;
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error('Error during Google login callback:', err);
        return res.redirect('/');
    }
};


// GET registration page (No isAuthenticated middleware here)
router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '/../public/register.html'));
});

// POST registration form submission
router.post('/register', authController.register);

// GET verify OTP page (No isAuthenticated middleware here)
router.get('/verify-otp', (req, res) => {
  res.sendFile(path.join(__dirname, '/../public/verify-otp.html'));
});

// POST OTP verification
router.post('/verify-otp', authController.verifyOtp);

// GET login page (No isAuthenticated middleware here)
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '/../public/login.html'));
});

// ✨ MODIFIED: POST login form submission using Passport's local strategy ✨
router.post('/login', passport.authenticate('local', {
    failureRedirect: '/auth/login?login=error', // Redirect on failure
    failureFlash: false
}), authController.login); // authController.login will now only handle email sending and redirection

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth/login?login=google_error' }), exports.googleCallback); // Use exports.googleCallback

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.redirect('/auth/login?loggedout=true');
        });
    });
});

module.exports = router;