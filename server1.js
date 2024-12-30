const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3002",  // Allow frontend access
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const PORT = 5000;
const JWT_SECRET = 'your-secret-key';  // Replace with a strong secret

// Initialize Sequelize ORM (PostgreSQL database)
const sequelize = new Sequelize('user_db', 'your_username', 'your_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  place: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  interested: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// Sync the database models
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// User Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// User Signup Route
app.post('/signup', async (req, res) => {
  const { username, email, password, place, age, gender, interested } = req.body;

  if (!username || !email || !password || !place || !age || !gender || !interested) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if the user already exists
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      place,
      age,
      gender,
      interested,
    });

    // Send back user profile data and a success message
    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        place: newUser.place,
        age: newUser.age,
        gender: newUser.gender,
        interested: newUser.interested,
      },
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// User Login Route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update user status to online
    await User.update(
      { isOnline: true },
      { where: { id: user.id } }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        place: user.place,
        age: user.age,
        gender: user.gender,
        interested: user.interested
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket.IO for real-time chat (as per your previous code)
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (userData) => {
    connectedUsers.set(socket.id, userData);
    io.emit('user-joined', { systemMessage: `${userData.username} joined the chat`, onlineCount: connectedUsers.size });
  });

  socket.on('send-message', async (messageData) => {
    try {
      io.emit('new-message', messageData);
    } catch (error) {
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('private-message', async (data) => {
    try {
      const receiverSocket = Array.from(connectedUsers.entries())
        .find(([, id]) => id === data.receiverId)?.[0];

      if (receiverSocket) {
        io.to(receiverSocket).emit('new-private-message', data);
      }
      socket.emit('new-private-message', data);
    } catch (error) {
      socket.emit('error', 'Failed to send private message');
    }
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
