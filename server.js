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
const isAuthenticated = require('./middleware/isAuthenticated');
require('./config/passport');

const app = express();

// --- CRITICAL FIX: Tell Express to trust the proxy (Render) ---
app.set('trust proxy', 1); // Or 'true' if you expect multiple layers of proxies

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(colors.yellow('MongoDB connected successfully')))
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));

// --- Core Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Session Setup ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, 
    saveUninitialized: false,
    // No 'rolling: true' needed for logout on close

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        // Setting a TTL for server-side cleanup (e.g., 24 hours)
        // This acts as a fallback if the browser doesn't clear the cookie immediately on close.
        ttl: 24 * 60 * 60, // 24 hours in seconds
        autoRemove: 'interval',
        autoRemoveInterval: 10 // In minutes.
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        // --- REMOVED maxAge: This makes it a session cookie that expires on browser close ---
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        domain: process.env.NODE_ENV === 'production' ? '.adnextechnologies.in' : undefined
    }
}));

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Static Files ---
app.use(express.static('public'));

// --- Routes ---
app.use('/auth', authRoutes);

app.get('/auth/login', (req, res) => {
    res.redirect(process.env.FRONTEND_URL + '/login.html' + (req.query.login ? `?login=${req.query.login}` : ''));
});

// Protected routes
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
});
