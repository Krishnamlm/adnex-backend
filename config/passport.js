// Inside config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy; // If not already there
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Assuming your User model is here

passport.use(new LocalStrategy({
        usernameField: 'email' // Use email as the username field
    },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });

            if (!user) {
                return done(null, false, { message: 'Incorrect email or password.' });
            }

            // Check if the user is verified
            if (!user.isVerified) {
                // Return done with a message that indicates not verified
                return done(null, false, { message: 'Account not verified. Please check your email for OTP.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return done(null, false, { message: 'Incorrect email or password.' });
            }

            return done(null, user); // User authenticated and verified
        } catch (err) {
            return done(err);
        }
    }
));

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Google Strategy (if you have one, ensure it also considers `isVerified`)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // If user exists, but is not verified (e.g., first login via Google, but didn't complete email OTP)
        // You might want to handle this differently, e.g., prompt for email verification after Google login.
        // For simplicity, we'll just allow direct login if the Google account is already linked.
        // If you *really* want to force email OTP even for Google users, you'd need a more complex flow.
        // For now, we'll assume Google login inherently "verifies" the user because Google itself verifies email.
        user.isVerified = true; // Mark as verified if logging in via Google
        await user.save();
        done(null, user);
      } else {
        // Create new user for Google login
        user = new User({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          isVerified: true // Google users are considered verified by default (their email is verified by Google)
        });
        await user.save();
        done(null, user);
      }
    } catch (err) {
      done(err, null);
    }
  }
));