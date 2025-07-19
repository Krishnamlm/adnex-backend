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
const authenticateJWT = require('./middleware/authenticateJWT'); // JWT middleware
require('./config/passport'); // Passport configuration

const app = express();

// --- CRITICAL FIX: Tell Express to trust the proxy (Render) ---
app.set('trust proxy', 1);

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(colors.yellow('MongoDB connected successfully')))
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));

// --- Core Middleware ---
// CORS Configuration - UPDATED FOR CUSTOM DOMAIN AND ARRAY OF ORIGINS
const allowedOrigins = [
    'https://adnextechnologies.in', // Your custom domain
    'https://adnex-frontend-ui2a.onrender.com' // Your Render subdomain (for robustness)
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.error(msg); // Log the origin that failed
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    credentials: true, // IMPORTANT: Allows cookies (for sessions) and authorization headers
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

app.use(morgan('dev')); // HTTP request logger
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for form submissions)
app.use(express.json()); // Parse JSON bodies

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
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        httpOnly: true, // Prevent client-side JS from reading cookies
        sameSite: 'lax', // Relaxed same-site policy for cross-site requests
    }
}));

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Static Files ---
// IMPORTANT: REMOVE this line if your 'public' folder only contained frontend HTML/CSS/JS files
// that are now served by your separate frontend deployment.
// Keep it *only* if this 'public' folder contains static assets specific to the backend API itself (e.g., API documentation, images that backend serves directly, not via the frontend).
// For now, let's remove it to ensure clean separation.
// app.use(express.static(path.join(__dirname, 'public')));


// --- API Routes ---
app.use('/auth', authRoutes); // All /auth/* routes are handled by authRoutes

// Protected API routes (e.g., if you have data endpoints)
// IMPORTANT: These are for data, not for serving HTML files.
app.get('/api/protected-data', authenticateJWT, (req, res) => {
    res.json({ message: 'This is protected data!', user: req.user.id });
});

// NEW ENDPOINT: Check authentication status from client-side
app.get('/auth/status', authenticateJWT, (req, res) => {
    // If authenticateJWT passes, req.user will be populated
    res.status(200).json({ isAuthenticated: true, user: req.user.id }); // Use req.user.id from JWT
});

// --- REMOVE ALL HTML SERVING ROUTES ---
// These routes are now handled by your separate frontend deployment.
// Delete or comment out these blocks:
// app.get('/contact', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'contact.html')); });
// app.get('/internship-form', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'internship-form.html')); });
// app.get('/graphic-html', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'graphic.html')); });
// app.get('/development-html', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'development.html')); });
// app.get('/digital-html', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'digital.html')); });

// --- REMOVE the Catch-all Route for Frontend HTML files ---
// This route is also now handled by your separate frontend deployment.
// app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });


// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(colors.red('Global Error Handler:'), err.stack);
    res.status(500).send('Something broke on the server!');
});


// --- Start server ---
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(colors.green(`Server started on port ${port}`));
});
