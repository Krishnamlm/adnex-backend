// adnex-backend/middleware/authenticateJWT.js

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this matches your .env key

module.exports = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    // Log for debugging
    console.log('authenticateJWT middleware: Checking Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('authenticateJWT middleware: No token found or invalid format.');
        // If no token, or malformed, deny access or redirect to login
        // For API routes, send 401. For HTML routes, redirect to login.
        if (req.accepts('html')) {
            // If the request expects HTML (e.g., direct browser navigation)
            req.session.returnTo = req.originalUrl; // Store URL for post-login redirect
            return res.redirect('/login.html?login=required');
        } else {
            // For API calls (e.g., fetch requests)
            return res.status(401).json({ message: 'No authorization token provided or token format is invalid.' });
        }
    }

    const token = authHeader.split(' ')[1]; // Extract the token (e.g., "Bearer YOUR_TOKEN" -> "YOUR_TOKEN")

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Log for debugging
        console.log('authenticateJWT middleware: Token decoded:', decoded);

        // Attach user ID from token to request object
        req.user = { id: decoded.id }; // Assuming your token payload has an 'id' field
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        console.error('authenticateJWT middleware: Token verification failed:', error.message);
        // If token is invalid or expired
        if (req.accepts('html')) {
            // If the request expects HTML
            req.session.returnTo = req.originalUrl; // Store URL for post-login redirect
            return res.redirect('/login.html?login=expired');
        } else {
            // For API calls
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
    }
};