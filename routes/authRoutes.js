// adnex-backend/routes/authRoutes.js

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
// const isAuthenticated = require('../middleware/isAuthenticated'); // Will be replaced by JWT middleware
const { sendEmail } = require('../utils/sendEmail');
const jwt = require('jsonwebtoken'); // <-- NEW: Import jsonwebtoken

// --- JWT Configuration ---
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h'; // Token expiration time (e.g., 1 hour)

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
                // CHANGE THIS LINE: Use FRONTEND_URL
                return res.redirect(`${process.env.FRONTEND_URL}/verify-otp.html?error=not_verified_google`);
            });
            return;
        }

        // User is authenticated and verified, so generate JWT
        const token = generateToken(req.user.id);

        const subject = '✅ You’ve Signed In to Adnex Technologies (via Google)';
        const html = `<div style="padding:20px;font-family:sans-serif;"><h2>Welcome, ${req.user.username}!</h2><p>You’ve successfully logged in using your Google account.</p><p>Thanks for joining Adnex Technologies 🚀</p></div>`;
        await sendEmail({ to: req.user.email, subject, html });

        // CHANGE THIS LINE: Use FRONTEND_URL
        return res.redirect(`${process.env.FRONTEND_URL}/auth-success.html#token=${token}`);

    } catch (err) {
        console.error('Error during Google login callback:', err);
        // CHANGE THIS LINE: Use FRONTEND_URL
        return res.redirect(`${process.env.FRONTEND_URL}/login.html?login=google_error`);
    }
};

// Note: Removed the router.get('/register'), router.get('/verify-otp'), router.get('/login') HTML redirects from here.
// These static HTML files are now served directly by server.js's `app.use(express.static('public'))`
// and `app.get('*')` catch-all route when accessed directly (e.g., /login.html).
// This file (authRoutes.js) should primarily handle API authentication logic.

// POST registration form submission
router.post('/register', authController.register);

// POST verify OTP submission
router.post('/verify-otp', authController.verifyOtp);

// MODIFIED: POST login form submission using Passport's local strategy
router.post('/login', passport.authenticate('local', {
    // CHANGE THIS LINE: Use FRONTEND_URL
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?login=error`,
    failureFlash: false
}), async (req, res) => {
    // This code runs ONLY on successful local authentication

    // Optional: Send a welcome email for local login
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

    // Generate JWT for local login
    const token = generateToken(req.user.id);

    // CHANGE THIS LINE: Use FRONTEND_URL
    return res.redirect(`${process.env.FRONTEND_URL}/auth-success.html#token=${token}`);
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { 
    // CHANGE THIS LINE: Use FRONTEND_URL
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?login=google_error` 
}), handleGoogleCallback);

// --- Logout route (Now adapted for JWT setup) ---
router.get('/logout', (req, res, next) => {
    // With JWTs, client-side handles token removal from localStorage.
    // We can still clear server-side session (if using sessions for other purposes)
    // and invalidate the session cookie for good measure.
    req.logout((err) => { // This removes req.user and clears Passport's session data
        if (err) { console.error('Logout error:', err); return next(err); }
        // If you are relying purely on JWTs and no longer need express-session
        // for authentication state after login, you might remove session.destroy.
        // For now, keep it for clean shutdown of any residual session data.
        req.session.destroy(() => {
            // After successful logout and session destruction, redirect to the login page.
            // CHANGE THIS LINE: Use FRONTEND_URL
            res.redirect(`${process.env.FRONTEND_URL}/login.html?loggedout=true`);
        });
    });
});

module.exports = router;
