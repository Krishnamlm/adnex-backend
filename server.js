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

const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
// const isAuthenticated = require('./middleware/isAuthenticated'); // <-- COMMENT OUT or REMOVE this line!
const authenticateJWT = require('./middleware/authenticateJWT'); // <-- NEW: Import the JWT middleware

require('./config/passport'); // Passport configuration

const app = express();

// --- CRITICAL FIX: Tell Express to trust the proxy (Render) ---
app.set('trust proxy', 1);

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(colors.yellow('MongoDB connected successfully')))
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));

// --- Core Middleware ---
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Session Setup (Still needed for Passport's initial local/Google login success) ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 24 hours in seconds
        autoRemove: 'interval',
        autoRemoveInterval: 10 // In minutes.
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
    }
}));

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes (MUST come before any frontend HTML serving routes that might match the same path) ---
app.use('/auth', authRoutes); // All /auth/* routes are handled by authRoutes

// Protected routes serving HTML files (assuming these HTMLs are now directly in 'public')
// *** CRITICAL CHANGE: Replace isAuthenticated with authenticateJWT for these routes! ***
app.get('/contact', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/internship-form', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'internship-form.html'));
});

app.get('/graphic-html', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'graphic.html'));
});

app.get('/development-html', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'development.html'));
});

app.get('/digital-html', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'digital.html'));
});

// NEW ENDPOINT: Check authentication status from client-side
// *** CRITICAL CHANGE: Replace isAuthenticated with authenticateJWT for this route! ***
app.get('/auth/status', authenticateJWT, (req, res) => {
    // If authenticateJWT passes, req.user will be populated
    res.status(200).json({ isAuthenticated: true, user: req.user.id }); // Use req.user.id from JWT
});

// --- Catch-all Route for Frontend HTML files ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(colors.green(`Server started on port ${port}`));
});
