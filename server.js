// adnex-backend/server.js

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors');
require('dotenv').config();

// --- 1. NEW: Import connect-mongo for persistent sessions ---
const MongoStore = require('connect-mongo'); // <--- ADD THIS LINE

// Import routes and middleware
const authRoutes = require('./routes/authRoutes');
const isAuthenticated = require('./middleware/isAuthenticated'); // Ensure this file also redirects to FRONTEND_URL
require('./config/passport');

const app = express();

// --- MongoDB Connection (Moved to top for clarity and early error catching) ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(colors.yellow('MongoDB connected successfully')))
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));


// --- Core Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL, // Use process.env.FRONTEND_URL for consistency
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Crucial for sending/receiving cookies cross-origin
}));
app.use(morgan('dev')); // HTTP request logger middleware
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for form submissions)
app.use(express.json()); // Parse JSON bodies

// --- Session Setup (MUST come before Passport middleware) ---
app.use(session({
    secret: process.env.SESSION_SECRET, // Use a strong secret from .env
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    
    // --- 2. CRITICAL FIX: Use connect-mongo as the session store ---
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions', // Optional: specify collection name
        ttl: 14 * 24 * 60 * 60, // Session TTL in seconds (e.g., 14 days), matches cookie maxAge below
        autoRemove: 'interval',
        autoRemoveInterval: 10 // In minutes. To clean expired sessions
    }),
    
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true if HTTPS, false for HTTP (localhost)
        maxAge: 1000 * 60 * 60 * 24 * 14, // *** INCREASED: 14 days (consistent with store TTL) ***
        httpOnly: true, // Prevent client-side JS from accessing the cookie
        
        // --- 3. CRITICAL FIX: 'none' for production cross-site cookies ---
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' 
    }
}));

// --- Passport Middleware (MUST come after session middleware) ---
app.use(passport.initialize());
app.use(passport.session()); // This enables Passport to use sessions

// --- Static Files (Serve files from 'public' directory of the backend, if any) ---
// Removed redundant second app.use(express.static('public'));
app.use(express.static('public'));

// --- Routes ---
app.use('/auth', authRoutes);

// Corrected GET /auth/login route: Redirect to frontend's login page
app.get('/auth/login', (req, res) => {
    res.redirect(process.env.FRONTEND_URL + '/login.html' + (req.query.login ? `?login=${req.query.login}` : ''));
});

// Protected routes - these will use the isAuthenticated middleware
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

// --- Start server ---
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(colors.green(`Server started on port ${port}`));
    // Removed redundant MongoDB connected message here as it's logged in the .then() block
});