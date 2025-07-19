// middleware/isAuthenticated.js
module.exports = (req, res, next) => {
    console.log('isAuthenticated middleware: Checking authentication for URL:', req.originalUrl); // Log added
    console.log('isAuthenticated middleware: req.session.passport:', req.session.passport); // Log added
    console.log('isAuthenticated middleware: req.user:', req.user ? req.user.email : 'None'); // Log added

    if (req.isAuthenticated()) {
        console.log('isAuthenticated middleware: User IS authenticated.'); // Log added
        return next();
    }

    console.log('isAuthenticated middleware: User NOT authenticated. Redirecting to /auth/login.'); // Log added
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
};
