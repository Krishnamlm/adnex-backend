// adnex-backend/server.js

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors'); // Keep if you expect other external API consumers
const morgan = require('morgan');
const colors = require('colors');
require('dotenv').config();

const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const isAuthenticated = require('./middleware/isAuthenticated');
require('./config/passport');

const app = express();

// --- CRITICAL FIX: Tell Express to trust the proxy (Render) ---
app.set('trust proxy', 1);

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(colors.yellow('MongoDB connected successfully')))
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));

// --- Core Middleware ---
// Adjust CORS for monolithic setup.
// If your frontend and backend are on the SAME origin now, CORS is technically not needed for requests between them.
// Keep it if you have other external API consumers, otherwise you can simplify/remove.
app.use(cors({
    origin: true, // Allow the request's origin (good for same-site, or if you also have external clients)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Crucial for sending cookies with AJAX requests
}));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Session Setup ---
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
        // *** CRITICAL CHANGE: SameSite is now 'lax' for a monolithic app ***
        sameSite: 'lax', // Use 'lax' or 'strict' as it's now same-site
    }
}));

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Static Files ---
// This serves all files directly from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public'))); // Use path.join for robustness


// --- API Routes (MUST come before any frontend HTML serving routes that might match the same path) ---
app.use('/auth', authRoutes); // All /auth/* routes are handled by authRoutes

// --- REMOVED: Conflicting /auth/login route. authRoutes handles this. ---
// app.get('/auth/login', (req, res) => {
//     res.redirect(process.env.FRONTEND_URL + '/login.html' + (req.query.login ? `?login=${req.query.login}` : ''));
// });

// Protected routes serving HTML files (assuming these HTMLs are now directly in 'public')
app.get('/contact', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html')); // *** ADJUSTED PATH ***
});

app.get('/internship-form', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'internship-form.html')); // *** ADJUSTED PATH ***
});

app.get('/graphic-html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'graphic.html')); // *** ADJUSTED PATH ***
});

app.get('/development-html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'development.html')); // *** ADJUSTED PATH ***
});

app.get('/digital-html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'digital.html')); // *** ADJUSTED PATH ***
});

// NEW ENDPOINT: Check authentication status from client-side
app.get('/auth/status', isAuthenticated, (req, res) => {
    res.status(200).json({ isAuthenticated: true, user: req.user.username });
});

// --- Catch-all Route for Frontend HTML files (CRITICAL FOR MONOLITHIC SPA-like setup) ---
// This serves your main index.html for any route not explicitly handled above.
// It MUST be placed AFTER all API routes and specific HTML file serving routes.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Start server ---
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(colors.green(`Server started on port ${port}`));
});
