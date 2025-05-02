const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
require('dotenv').config();

// Facebook App Credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'your-app-id';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'your-app-secret';
const FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/auth/facebook/callback';

// Load environment variables
dotenv.config();

const app = express();

// Database connection
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fb_video_saver');

// Session middleware
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.PRODUCTION_CLIENT_URL : process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/fb_video_saver' }),
  cookie: {
    maxAge: 3600000, // 1 hour
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Facebook OAuth Configuration
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'videos']
},
function(accessToken, refreshToken, profile, done) {
  // Store user data with access token in secure httpOnly cookie
  const userData = { profile, accessToken };
  return done(null, userData);
}));

// Routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['user_videos'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  (req, res) => {
    // Set secure httpOnly cookie with token
    res.cookie('fb_token', req.user.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    // Return user profile data to frontend (without token)
    res.json({ profile: req.user.profile });
  }
);

app.get('/api/videos', async (req, res) => {
  try {
    // Get token from secure cookie instead of query param
    const accessToken = req.cookies.fb_token;
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await axios.get(`https://graph.facebook.com/me/videos?access_token=${accessToken}&fields=source,description,created_time`);

    // Handle Facebook API rate limits
    if (response.data.error && response.data.error.code === 4) {
      return res.status(429).json({
        error: 'API rate limit reached',
        retryAfter: response.data.error.error_subcode || 60
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Facebook API error:', error);
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.message,
      code: error.response?.data?.error?.code
    });
  }
});

// Download History Schema
const DownloadHistory = mongoose.model('DownloadHistory', new mongoose.Schema({
  userId: String,
  videoUrl: String,
  downloadedAt: { type: Date, default: Date.now }
}));

app.get('/api/download', async (req, res) => {
  try {
    const { videoUrl } = req.query;
    const userId = req.user?.profile?.id;

    if (userId) {
      // Save download history
      await DownloadHistory.create({
        userId,
        videoUrl
      });
    }

    // Stream video for download
    const response = await axios.get(videoUrl, { responseType: 'stream' });

    // Track download progress
    let bytesDownloaded = 0;
    response.data.on('data', (chunk) => {
      bytesDownloaded += chunk.length;
      // Could emit progress events here if using WebSockets
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: error.message,
      code: error.response?.status
    });
  }
});

// Get download history
app.get('/api/history', async (req, res) => {
  try {
    const userId = req.user?.profile?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const history = await DownloadHistory.find({ userId }).sort({ downloadedAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Production-ready server setup
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));
