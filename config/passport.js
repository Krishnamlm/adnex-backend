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
    callbackURL: "https://adnex-backend.onrender.com/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // If user exists, ensure they are marked as verified if logging in via Google
        // This assumes Google's authentication inherently verifies the email.
        if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }
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
