const express = require('express');
// const http = require('http');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(bodyParser.json());

let otps = {};

const JWT_SECRET = 'your_jwt_secret';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'giridhaar1105@gmail.com',
    pass: 'ehff dyjk ijmh wiyt'
  }
});

const authenticateJWT = (req, res, next) => {
  const token = req.query.token || req.headers['authorization'];

  if (!token) {
    return res.status(403).send('Access denied');
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send('Invalid token');
    }
    req.user = user;
    next();
  });
};

app.post('/signup', (req, res) => {
  const { username, email, otp, password, place, age, gender, interested } = req.body;

  if (!username || !email || !otp || !password || !place || !age || !gender || !interested) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!otps[email] || otps[email] !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  if (isNaN(age) || age < 18) {
    return res.status(400).json({ message: 'Age must be a valid number and at least 18' });
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const userData = { username, email, password, place, age, gender, interested };

  res.status(200).json({ message: 'Signup successful! You can now log in.', userData });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const userData = { email, username: 'You' };
  if (userData.password !== password) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign({ email: userData.email, username: userData.username }, JWT_SECRET, { expiresIn: '1h' });

  res.status(200).json({
    message: 'Login successful',
    token,
    user: userData
  });
});

app.post('/getOtp', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  otps[email] = otp;

  const mailOptions = {
    from: 'giridhaar1105@gmail.com',
    to: email,
    subject: 'Your OTP for Signup',
    text: `Your OTP is: ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: 'Failed to send OTP. Try again later.' });
    }
    res.status(200).json({ message: 'OTP sent to your email!' });
  });
});

app.post('/gemini-1.5-flash', async (req, res) => {
  const { input, timestamp } = req.body;
  const Prompt = `Talk with love like life partner.Talk with love.Your name is Mia.
  Answer in short`;

  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Invalid input text' });
  }

  try {
    const geminiApiResponse = await processWithGemini(Prompt, input);
    res.status(200).json({
      timestamp,
      input,
      aiResponse: geminiApiResponse,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error processing the request' });
  }
});

async function processWithGemini(Prompt, input) {
  try {
    const response = await axios({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAqHm7CnzubwjA_sOiiH8wEwkp8v71rFcY`,
      method: "post",
      data: {
        contents: [{ parts: [{ text: Prompt + input }] }],
      },
    });
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    console.log(aiResponse);
    return aiResponse;
  } catch (error) {
    console.error('Error in calling Gemini 1.5 Flash API:', error);
    console.error('Server Response:', error.response.data);
    throw new Error('Failed to process the request');
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
