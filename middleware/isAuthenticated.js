// middleware/isAuthenticated.js
module.exports = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // Store the requested URL (e.g., /internship)
    req.session.returnTo = req.originalUrl;

    // Redirect to login
    return res.redirect('/auth/login');
};
