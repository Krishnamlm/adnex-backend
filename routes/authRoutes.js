// adnex-backend/routes/authRoutes.js

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
// const isAuthenticated = require('../middleware/isAuthenticated'); // We will replace this later
const { sendEmail } = require('../utils/sendEmail');
const jwt = require('jsonwebtoken'); // <-- NEW: Import jsonwebtoken

// --- JWT Configuration (NEW) ---
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h'; // Token expiration time (e.g., 1 hour)

// Helper function to generate a JWT (NEW)
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};


// Helper function for Google Callback
const handleGoogleCallback = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isVerified) {
            // For unverified users, we might still redirect to verify-otp page
            // and NOT issue a JWT. They need to complete verification first.
            req.logout((err) => {
                if (err) { console.error('Logout error during unverified Google login:', err); return next(err); }
                req.session.email = req.user ? req.user.email : '';
                return res.redirect(`/verify-otp.html?error=not_verified_google`);
            });
            return;
        }

        // User is authenticated and verified, so generate JWT
        const token = generateToken(req.user.id); // <-- NEW: Generate JWT

        const subject = '✅ You’ve Signed In to Adnex Technologies (via Google)';
        const html = `<div style="padding:20px;font-family:sans-serif;"><h2>Welcome, ${req.user.username}!</h2><p>You’ve successfully logged in using your Google account.</p><p>Thanks for joining Adnex Technologies 🚀</p></div>`;
        await sendEmail({ to: req.user.email, subject, html });

        // Redirect to auth-success.html with the token in the URL hash
        // Using hash (#) is often preferred over query (?) for sensitive data like tokens
        // as hashes are not sent to the server in subsequent requests.
        // We will read this from the frontend.
        return res.redirect(`/auth-success.html#token=${token}`); // <-- CHANGED

    } catch (err) {
        console.error('Error during Google login callback:', err);
        return res.redirect(`/login.html?login=google_error`);
    }
};

// ... (existing routes for /register, /verify-otp, /login HTML redirects) ...

// MODIFIED: POST login form submission using Passport's local strategy
router.post('/login', passport.authenticate('local', {
    failureRedirect: `/login.html?login=error`,
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
    const token = generateToken(req.user.id); // <-- NEW: Generate JWT

    // Redirect to auth-success.html with the token in the URL hash
    return res.redirect(`/auth-success.html#token=${token}`); // <-- CHANGED
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: `/login.html?login=google_error` }), handleGoogleCallback);

// --- Logout route (Will be updated later for JWTs, but for now, clear session) ---
router.get('/logout', (req, res, next) => {
    // With JWTs, client-side handles token removal.
    // We can still clear server-side session for good measure, but it's less critical.
    req.logout((err) => { // This removes req.user and clears Passport's session data
        if (err) { console.error('Logout error:', err); return next(err); }
        req.session.destroy(() => { // This destroys the session on the server and invalidates the cookie
            res.redirect(`/login.html?loggedout=true`);
        });
    });
});

module.exports = router;