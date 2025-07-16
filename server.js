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
// Use authRoutes for all /auth paths (e.g., /auth/login, /auth/register, /auth/google)
app.use('/auth', authRoutes);




// Route for successful authentication, serving the main index page
app.get('/auth/login',(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});
app.get('/auth/success', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Protected routes - these will use the isAuthenticated middleware
app.get('/contact', isAuthenticated, (req, res) => { // Contact page is now protected
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
// This route is protected. If reached, user is authenticated.
app.get('/auth/status', isAuthenticated, (req, res) => {
    // If this middleware is reached, the user is authenticated
    // req.user is populated by Passport's deserializeUser
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
