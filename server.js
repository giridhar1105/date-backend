const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');  // For OTP generation

// Create Express app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(bodyParser.json());  // To parse JSON request body

// In-memory data (messages and online users)
let users = [];  // Stores connected users with {userId, username, socketId}
let messages = [];  // Stores chat messages {id, text, username, avatar}
let otps = {}; // Store OTPs in memory

// JWT Secret
const JWT_SECRET = 'your_jwt_secret'; // Replace with environment variable

// Nodemailer transporter setup (use your own SMTP service, e.g., Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'giridhaar1105@gmail.com',  // your email address
    pass: 'ehff dyjk ijmh wiyt'    // your email password or app-specific password
  }
});

// Middleware to authenticate JWT
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

// SignUp route
app.post('/signup', (req, res) => {
  const { username, email, otp, password, place, age, gender, interested } = req.body;

  // Validate input
  if (!username || !email || !otp || !password || !place || !age || !gender || !interested) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if the OTP is correct
  if (!otps[email] || otps[email] !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  // Further validation for age and email
  if (isNaN(age) || age < 18) {
    return res.status(400).json({ message: 'Age must be a valid number and at least 18' });
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // Save user details in memory (for simplicity)
  const userData = { username, email, password, place, age, gender, interested };

  // Store the user data temporarily in local storage (client-side, simulated by sending it in the response)
  // In real-world applications, localStorage would be accessed on the client side, not via the backend.

  res.status(200).json({ message: 'Signup successful! You can now log in.', userData });
});

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Check if user exists in localStorage (we simulate this by using the provided data)
  // In real-world applications, the user data should be checked from a persistent database.

  const userData = { email, username: 'You' }; // Simulated user data for example
  if (userData.password !== password) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  // Generate JWT token
  const token = jwt.sign({ email: userData.email, username: userData.username }, JWT_SECRET, { expiresIn: '1h' });

  // Send response with token and user data
  res.status(200).json({
    message: 'Login successful',
    token,
    user: userData
  });
});

// Generate OTP route
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join chat room (send token data)
  socket.on('join', ({ userId, username, avatar }) => {
    // Add user to the list of connected users
    users.push({ userId, username, socketId: socket.id });
    io.emit('user-joined', { systemMessage: `${username} has joined the chat.`, onlineCount: users.length });

    // Send previous chat messages to the newly joined user
    socket.emit('previous-messages', messages);
  });

  // Handle sending of a new message
  socket.on('send-message', ({ userId, username, text, avatar }) => {
    const message = { id: Date.now(), text, username, avatar };
    messages.push(message);  // Save the message in memory

    // Broadcast the message to all connected users
    io.emit('new-message', message);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const userIndex = users.findIndex(user => user.socketId === socket.id);
    if (userIndex !== -1) {
      const { username } = users[userIndex];
      users.splice(userIndex, 1);  // Remove the user from the list
      io.emit('user-left', { systemMessage: `${username} has left the chat.`, onlineCount: users.length });
    }
    console.log('A user disconnected:', socket.id);
  });
});

// Start the Express server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
