const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Gmail as the email service
  auth: {
    user: process.env.EMAIL_USER,  // From your .env file
    pass: process.env.EMAIL_PASS,  // From your .env file
  },
});

const otpStore = {};

const otpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per window
  message: 'Too many OTP requests from this IP, please try again later.',
});

app.post('/generate-otp', otpRateLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (otpStore[email] && Date.now() < otpStore[email].expiresAt) {
    return res.status(400).json({ message: 'OTP already sent. Please check your email.' });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  const OTP_EXPIRATION_TIME = 300000; 
  otpStore[email] = { otp, expiresAt: Date.now() + OTP_EXPIRATION_TIME };

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    });

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

app.post('/signup', async (req, res) => {
  const { username, email, otp, password, place, age, gender, interested } = req.body;

  if (!username || !email || !otp || !password || !place || !age || !gender || !interested) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const storedOTP = otpStore[email];

  if (!storedOTP) {
    return res.status(400).json({ message: 'No OTP generated for this email' });
  }

  if (Date.now() > storedOTP.expiresAt) {
    delete otpStore[email]; // Clear expired OTP
    return res.status(400).json({ message: 'OTP has expired' });
  }

  if (storedOTP.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }


  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        username,
        email,
        password,
        place,
        age,
        gender,
        interested,
      },
    ]);

  if (error) {
    return res.status(500).json({ message: 'Error saving user data', error });
  }

  delete otpStore[email];

  res.status(201).json({ message: 'User registered successfully', user: data[0] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
