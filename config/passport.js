// Inside config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

passport.use(new LocalStrategy({
        usernameField: 'email'
    },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });

            if (!user) {
                console.log('LocalStrategy: User not found for email:', email); // Log added
                return done(null, false, { message: 'Incorrect email or password.' });
            }

            if (!user.isVerified) {
                console.log('LocalStrategy: User not verified:', email); // Log added
                return done(null, false, { message: 'Account not verified. Please check your email for OTP.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                console.log('LocalStrategy: Password mismatch for email:', email); // Log added
                return done(null, false, { message: 'Incorrect email or password.' });
            }

            console.log('LocalStrategy: User authenticated:', user.email); // Log added
            return done(null, user);
        } catch (err) {
            console.error('LocalStrategy error:', err); // Log added
            return done(err);
        }
    }
));

// Serialize user
passport.serializeUser((user, done) => {
    console.log('serializeUser: User ID being serialized:', user.id); // Log added
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        console.log('deserializeUser: Attempting to find user with ID:', id); // Log added
        const user = await User.findById(id);
        if (user) {
            console.log('deserializeUser: User found:', user.email); // Log added
        } else {
            console.log('deserializeUser: User NOT found for ID:', id); // Log added
        }
        done(null, user);
    } catch (err) {
        console.error('deserializeUser error:', err); // Log added
        done(err);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://api.adnextechnologies.in/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GoogleStrategy: Profile received for:', profile.emails[0].value); // Log added
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        console.log('GoogleStrategy: User found by Google ID:', user.email); // Log added
        if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
            console.log('GoogleStrategy: Marked existing Google user as verified:', user.email); // Log added
        }
        return done(null, user);
      }

      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        console.log('GoogleStrategy: User found by email, linking Google ID:', user.email); // Log added
        user.googleId = profile.id;
        if (!user.isVerified) {
            user.isVerified = true;
        }
        await user.save();
        return done(null, user);
      }

      user = new User({
        googleId: profile.id,
        username: profile.displayName,
        email: profile.emails[0].value,
        isVerified: true
      });
      await user.save();
      console.log('GoogleStrategy: New user created:', user.email); // Log added
      return done(null, user);

    } catch (err) {
      console.error("Error in Google Strategy callback:", err); // Log added
      return done(err, null);
    }
  }
));
