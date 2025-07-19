// Inside config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // CRITICAL FIX: Use the full HTTPS URL for the callback
    callbackURL: "https://api.adnextechnologies.in/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Try to find user by Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // If user found by Google ID, ensure they are marked as verified if logging in via Google
        if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }
        return done(null, user);
      }

      // 2. If no user found by Google ID, try to find by email
      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // If user found by email, it means an account already exists.
        // Link this existing account to the Google ID.
        user.googleId = profile.id; // Link Google ID
        if (!user.isVerified) {
            user.isVerified = true; // Mark as verified if logging in via Google
        }
        await user.save();
        return done(null, user);
      }

      // 3. If no user found by Google ID OR email, create a new user
      user = new User({
        googleId: profile.id,
        username: profile.displayName,
        email: profile.emails[0].value,
        isVerified: true // Google users are considered verified by default (their email is verified by Google)
      });
      await user.save();
      return done(null, user);

    } catch (err) {
      // It's important to handle errors gracefully here.
      // If a duplicate key error occurs during 'user.save()' when creating a new user,
      // it means the email already exists and the above logic missed it, or there's a race condition.
      // Passport's done(err, null) will pass the error to the next middleware.
      console.error("Error in Google Strategy callback:", err);
      return done(err, null);
    }
  }
));
