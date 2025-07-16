const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors');
require('dotenv').config(); // Load environment variables

// Import routes and middleware
const authRoutes = require('./routes/authRoutes');
const isAuthenticated = require('./middleware/isAuthenticated');
require('./config/passport');

const app = express();

// --- Core Middleware ---
app.use(cors({origin: ['https://adnex-frontend-ui2a.onrender.com'], // Ensure this is your actual Render frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true})); // Enable CORS for all routes
app.use(morgan('dev')); // HTTP request logger middleware
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for form submissions)
app.use(express.json()); // Parse JSON bodies

// --- Session Setup (MUST come before Passport middleware) ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_dev', // Use a strong secret from .env
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true if HTTPS, false for HTTP (localhost)
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// --- Passport Middleware (MUST come after session middleware) ---
app.use(passport.initialize());
app.use(passport.session()); // This enables Passport to use sessions

// --- Static Files (Serve files from 'public' directory) ---
app.use(express.static('public'));

// --- Routes ---
// --- Static Files (Serve files from 'public' directory - this 'public' is for backend-specific assets, if any) ---
// Note: If you don't have any static files to serve from the backend's root 'public'
// other than the 'protected' ones, you could potentially remove this line,
// but it's usually harmless to keep for future backend-served static content.
app.use(express.static('public'));

// --- Routes ---
app.use('/auth', authRoutes);

// Corrected GET /auth/login route: Redirect to frontend's login page
app.get('/auth/login', (req, res) => {
    // FRONTEND_URL is available from process.env because dotenv is configured.
    res.redirect(process.env.FRONTEND_URL + '/login.html' + (req.query.login ? `?login=${req.query.login}` : ''));
});



// Protected routes - these will use the isAuthenticated middleware
// These files (contact.html, development.html, etc.) are in your backend's 'protected' folder
// So these routes are correct for serving protected backend-specific HTML.
app.get('/contact', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'contact.html'));
});

app.get('/internship-form', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'internship-form.html'));
});

app.get('/graphic-html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'graphic.html'));
});

app.get('/development-html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'development.html'));
});

app.get('/digital-html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'digital.html'));
});


// NEW ENDPOINT: Check authentication status from client-side
app.get('/auth/status', isAuthenticated, (req, res) => {
    res.status(200).json({ isAuthenticated: true, user: req.user.username });
});


// This module is imported and used in the routes above.
// The content below is for reference and should be in './middleware/isAuthenticated.js'
/*
module.exports = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login'); // Redirect to login if not authenticated
};
*/

// --- Connect MongoDB and start server ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        const port = process.env.PORT || 5000;
        app.listen(port, () => {
            console.log(colors.green(`Server started on port ${port}`));
            console.log(colors.yellow('MongoDB connected successfully'));
        });
    })
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));
