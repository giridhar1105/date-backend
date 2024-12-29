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
    origin: "http://localhost:9000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const sequelize = new Sequelize('user_db', 'your_username', 'your_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

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

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '😊'
  }
});

const PrivateMessage = sequelize.define('PrivateMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
});

sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

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

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (userData) => {
    connectedUsers.set(socket.id, userData);
    
    try {
      const messages = await Message.findAll({
        limit: 50,
        order: [['createdAt', 'DESC']],
      });
      socket.emit('previous-messages', messages.reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
    }

    io.emit('user-joined', {
      systemMessage: `${userData.username} joined the chat`,
      onlineCount: connectedUsers.size
    });
  });

  socket.on('send-message', async (messageData) => {
    try {
      const newMessage = await Message.create({
        userId: messageData.userId,
        username: messageData.username,
        text: messageData.text,
        avatar: messageData.avatar
      });

      io.emit('new-message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('private-message', async (data) => {
    try {
      const message = await PrivateMessage.create({
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text
      });

      const receiverSocket = Array.from(connectedUsers.entries())
        .find(([, id]) => id === data.receiverId)?.[0];

      if (receiverSocket) {
        io.to(receiverSocket).emit('new-private-message', message);
      }
      socket.emit('new-private-message', message);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('disconnect', async () => {
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      try {
        await User.update(
          { 
            isOnline: false,
            lastSeen: new Date()
          },
          { where: { id: userData.id } }
        );
        io.emit('user-status-change', { 
          userId: userData.id, 
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
      connectedUsers.delete(socket.id);
    }
  });
});

app.post('/gemini-1.5-flash', async (req, res) => {
  const { input, timestamp } = req.body;
  const Prompt = `Talk like you are a dating assistent.
  You are a dating assistant, and you are talking to a user who is looking for
  a relationship. The user is a ${input} looking for a relationship. You are
  trying to convince the user that you are the perfect match for them.
  Dont answer any quesions except dateing or love or sex life.
  n this your name should be Giridhar for a femail account and Renushree for a male account.
  `;

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

app.post('/signup', async (req, res) => {
  const { username, email, password, place, age, gender, interested } = req.body;

  if (!username || !email || !password || !place || !age || !gender || !interested) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      place,
      age,
      gender,
      interested,
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
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

async function processWithGemini(Prompt, input) {
  try {
    const response = await axios({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyBrS_O-7eVZx77WnjdsNhfFDBvxqA6VVGw",
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
    throw new Error('Failed to process the request');
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});