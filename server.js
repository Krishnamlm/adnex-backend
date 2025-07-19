// adnex-backend/server.js

const express = require('express');
const path = require('path'); // Still needed for __dirname but not for serving frontend static files
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors'); // Assuming you have 'colors' package
require('dotenv').config();

const MongoStore = require('connect-mongo'); // Assuming you have 'connect-mongo' package

const authRoutes = require('./routes/authRoutes');
const authenticateJWT = require('./middleware/authenticateJWT'); // Your JWT middleware
require('./config/passport'); // Your Passport configuration (make sure it's correct)

const app = express();

// --- CRITICAL FIX: Tell Express to trust the proxy (Render) ---
// This is essential for session.cookie.secure to work correctly behind Render's load balancer.
app.set('trust proxy', 1);

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(colors.yellow('MongoDB connected successfully')))
    .catch(err => console.error(colors.red('MongoDB connection error:', err)));

// --- Core Middleware ---
// CORS Configuration - Allows your frontend domains to make requests to this API
const allowedOrigins = [
    'https://adnextechnologies.in',        // Your custom frontend domain
    'https://adnex-frontend-ui2a.onrender.com' // Your Render frontend subdomain
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests during dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.error(msg); // Log the origin that failed
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods for CORS preflight
    credentials: true, // IMPORTANT: Allows cookies (for sessions) and Authorization headers
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204 for OPTIONS preflight
};
app.use(cors(corsOptions));

app.use(morgan('dev')); // HTTP request logger (for development, consider 'combined' for production)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for form submissions)
app.use(express.json()); // Parse JSON bodies

// --- Session Setup (Still needed for Passport's initial local/Google login success) ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions', // Name of the collection in MongoDB
        ttl: 24 * 60 * 60, // Session TTL (Time To Live) in seconds (24 hours)
        autoRemove: 'interval',
        autoRemoveInterval: 10 // In minutes. Checks for expired sessions every 10 minutes.
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production for HTTPS
        httpOnly: true, // Prevent client-side JS from reading cookies
        sameSite: 'lax', // 'strict', 'lax', or 'none'. 'lax' is generally safe for cross-site requests.
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    }
}));

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Static Files (ONLY if your backend serves its OWN, backend-specific static assets) ---
// If your 'public' folder contains *only* frontend files (HTML, CSS, JS) that are now served
// by your separate frontend deployment, then REMOVE or COMMENT OUT this line.
// For a pure API-only backend, this line is usually not needed.
// app.use(express.static(path.join(__dirname, 'public')));


// --- API Routes (Your Backend's Actual Functionality) ---
app.use('/auth', authRoutes); // Handles /auth/login, /auth/google, /auth/logout, etc.

// Example: A protected API endpoint that returns data
app.get('/api/protected-data', authenticateJWT, (req, res) => {
    // If authenticateJWT passes, req.user will be populated
    res.json({
        message: 'You have accessed protected data!',
        userId: req.user.id,
        username: req.user.username // Assuming your JWT payload includes username
    });
});

// Endpoint for frontend to check authentication status (without getting specific data)
app.get('/auth/status', authenticateJWT, (req, res) => {
    // If authenticateJWT passes, req.user will be populated
    res.status(200).json({ isAuthenticated: true, user: { id: req.user.id, username: req.user.username } }); // Return basic user info
});


// --- IMPORTANT: REMOVE ALL HTML SERVING ROUTES ---
// These routes are now handled by your separate frontend deployment (adnextechnologies.in).
// Ensure the following (and any similar routes that served HTML) are NOT in your server.js:
// app.get('/contact', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'contact.html')); });
// app.get('/internship-form', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'internship-form.html')); });
// app.get('/graphic-html', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'graphic.html')); });
// app.get('/development-html', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'development.html')); });
// app.get('/digital-html', authenticateJWT, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'digital.html')); });

// --- IMPORTANT: REMOVE the Catch-all Route for Frontend HTML files ---
// This route is also now handled by your separate frontend deployment.
// app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });


// --- Error Handling Middleware ---
// This should be the last middleware added.
app.use((err, req, res, next) => {
    console.error(colors.red('Global Error Handler:'), err.stack);
    // Send a generic error response for API calls
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});


// --- Start server ---
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(colors.green(`Server started on port ${port}`));
});
