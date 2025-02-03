const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for users and messages
let onlineUsers = {};
let messages = [];

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create transporter for sending OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'giridhaar1105@gmail.com',
    pass: 'ehff dyjk ijmh wiyt',
  },
});

// Store OTPs in memory
let otps = {};

// Helper function to authenticate JWT tokens
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

// Signup route
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

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // For simplicity, use a hardcoded user for login
  const user = { id: 1, email: 'user@example.com', password: '$2a$10$EaSdy5N5H9wwtBh/N..T2OmeVqv7VMIYtL5c8N.B5Q4U53A4iJhfe' }; // bcrypt hashed password

  if (email === user.email && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }

  return res.status(401).json({ message: 'Invalid email or password' });
});

// OTP route for signup
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
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: 'Failed to send OTP. Try again later.' });
    }
    res.status(200).json({ message: 'OTP sent to your email!' });
  });
});

// Route for Gemini AI integration
app.post('/gemini-1.5-flash', async (req, res) => {
  const { input, timestamp } = req.body;
  const Prompt = `Talk with love like life partner. Talk with love. You are Mia. You should answer in 2 lines and nothing more than that. Answer in short`;

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

// Socket.IO setup for real-time chat functionality
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  console.log('New client connected');
  const username = socket.user.email;
  const avatar = '😊'; // Placeholder avatar

  socket.emit('previous-messages', messages);

  socket.broadcast.emit('user-joined', {
    systemMessage: `${username} has joined the chat`,
    onlineCount: io.engine.clientsCount,
  });

  socket.on('send-message', (message) => {
    const newMessage = {
      id: Date.now(),
      username: message.username,
      text: message.text,
      avatar: message.avatar,
    };
    messages.push(newMessage);
    io.emit('new-message', newMessage);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    socket.broadcast.emit('user-left', {
      systemMessage: `${username} has left the chat`,
      onlineCount: io.engine.clientsCount,
    });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
