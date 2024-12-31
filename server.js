// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const { Sequelize, DataTypes } = require('sequelize');
// const bodyParser = require('body-parser');
// const axios = require('axios');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5000",
//     methods: ["GET", "POST"]
//   }
// });

// app.use(cors());
// app.use(express.json());
// app.use(bodyParser.json());

// const PORT = 5000;
// const JWT_SECRET = 'your-secret-key';

// const sequelize = new Sequelize('postgresql://postgres:giridhar1105@db.jmhoecsqdszaaohrlpze.supabase.co:5432/postgres', {
//   dialect: 'postgres',
//   logging: false,
// });

// sequelize.authenticate()
//   .then(() => console.log('Connection to Superbase database successful!'))
//   .catch(err => console.error('Unable to connect to the database:', err));

// // User Model
// const User = sequelize.define('User', {
//   username: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   email: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true,
//   },
//   password: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   place: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   age: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//   },
//   gender: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   interested: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   isOnline: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   },
//   lastSeen: {
//     type: DataTypes.DATE,
//     allowNull: true
//   }
// });

// // Message Model
// const Message = sequelize.define('Message', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   userId: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   username: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   text: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   avatar: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     defaultValue: '😊'
//   }
// });

// // Private Message Model
// const PrivateMessage = sequelize.define('PrivateMessage', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   senderId: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   receiverId: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   text: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   timestamp: {
//     type: DataTypes.DATE,
//     defaultValue: Sequelize.NOW
//   }
// });

// sequelize.sync()
//   .then(() => console.log('Database synced'))
//   .catch(err => console.error('Error syncing database:', err));

// // Authentication middleware
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ message: 'No token provided' });
//   }

//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({ message: 'Invalid token' });
//     }
//     req.user = user;
//     next();
//   });
// };

// // WebSocket handling
// const connectedUsers = new Map();

// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('join', async (userData) => {
//     connectedUsers.set(socket.id, userData);
    
//     try {
//       const messages = await Message.findAll({
//         limit: 50,
//         order: [['createdAt', 'DESC']],
//       });
//       socket.emit('previous-messages', messages.reverse());
//     } catch (error) {
//       console.error('Error fetching messages:', error);
//     }

//     io.emit('user-joined', {
//       systemMessage: `${userData.username} joined the chat`,
//       onlineCount: connectedUsers.size
//     });
//   });

//   socket.on('send-message', async (messageData) => {
//     try {
//       const newMessage = await Message.create({
//         userId: messageData.userId,
//         username: messageData.username,
//         text: messageData.text,
//         avatar: messageData.avatar
//       });

//       io.emit('new-message', newMessage);
//     } catch (error) {
//       console.error('Error saving message:', error);
//       socket.emit('error', 'Failed to send message');
//     }
//   });

//   socket.on('private-message', async (data) => {
//     try {
//       const message = await PrivateMessage.create({
//         senderId: data.senderId,
//         receiverId: data.receiverId,
//         text: data.text
//       });

//       const receiverSocket = Array.from(connectedUsers.entries())
//         .find(([, id]) => id === data.receiverId)?.[0];

//       if (receiverSocket) {
//         io.to(receiverSocket).emit('new-private-message', message);
//       }
//       socket.emit('new-private-message', message);
//     } catch (error) {
//       console.error('Error saving message:', error);
//       socket.emit('error', 'Failed to send message');
//     }
//   });

//   socket.on('disconnect', async () => {
//     const userData = connectedUsers.get(socket.id);
//     if (userData) {
//       try {
//         await User.update(
//           { 
//             isOnline: false,
//             lastSeen: new Date()
//           },
//           { where: { id: userData.id } }
//         );
//         io.emit('user-status-change', { 
//           userId: userData.id, 
//           isOnline: false,
//           lastSeen: new Date()
//         });
//       } catch (error) {
//         console.error('Error updating user status:', error);
//       }
//       connectedUsers.delete(socket.id);
//     }
//   });
// });

// // REST API endpoints
// app.post('/gemini-1.5-flash', async (req, res) => {
//   const { input, timestamp } = req.body;
//   const Prompt = `Talk with love. Talk in short sentences.
//   `;

//   if (!input || typeof input !== 'string') {
//     return res.status(400).json({ error: 'Invalid input text' });
//   }

//   try {
//     const geminiApiResponse = await processWithGemini(Prompt, input);
//     res.status(200).json({
//       timestamp,
//       input,
//       aiResponse: geminiApiResponse,
//     });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Error processing the request' });
//   }
// });

// app.post('/signup', async (req, res) => {
//   const { username, email, password, place, age, gender, interested } = req.body;

//   if (!username || !email || !password || !place || !age || !gender || !interested) {
//     return res.status(400).json({ message: 'All fields are required' });
//   }

//   try {
//     const userExists = await User.findOne({ where: { email } });

//     if (userExists) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const newUser = await User.create({
//       username,
//       email,
//       password,  // Store password as plain text (not recommended for production)
//       place,
//       age,
//       gender,
//       interested,
//     });

//     return res.status(201).json({
//       message: 'User created successfully',
//       user: {
//         username: newUser.username,
//         email: newUser.email,
//         place: newUser.place,
//         age: newUser.age,
//         gender: newUser.gender,
//         interested: newUser.interested,
//       },
//     });
//   } catch (error) {
//     console.error('Error creating user:', error);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// app.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const user = await User.findOne({ where: { email } });
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     if (password !== user.password) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     const token = jwt.sign(
//       { 
//         id: user.id,
//         email: user.email,
//         username: user.username
//       },
//       JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     await User.update(
//       { isOnline: true },
//       { where: { id: user.id } }
//     );

//     res.json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user.id,
//         username: user.username,
//         email: user.email,
//         place: user.place,
//         age: user.age,
//         gender: user.gender,
//         interested: user.interested
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// async function processWithGemini(Prompt, input) {
//   try {
//     const response = await axios({
//       url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyBrS_O-7eVZx77WnjdsNhfFDBvxqA6VVGw",
//       method: "post",
//       data: {
//         contents: [{ parts: [{ text: Prompt + input }] }], 
//       },
//     });
//     const aiResponse = response.data.candidates[0].content.parts[0].text;
//     console.log(aiResponse);
//     return aiResponse;
//   } catch (error) {
//     console.error('Error in calling Gemini 1.5 Flash API:', error);
//     throw new Error('Failed to process the request');
//   }
// }

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });








// server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
    'DATABASE_URL=postgresql://postgres:giridhar1105@db.jmhoecsqdszaaohrlpze.supabase.co:5432/postgres',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptaG9lY3NxZHN6YWFvaHJscHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MjgyNjksImV4cCI6MjA1MTIwNDI2OX0.-gkpvxnC6Zdz8iV5kAG8tvJBHpEewqpX05ST6SRU5F8'
);

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, 'YOUR_JWT_SECRET', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Signup endpoint
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, place, age, gender, interested } = req.body;

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select()
            .or(`email.eq.${email},username.eq.${username}`)
            .single();

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    email,
                    password_hash: passwordHash,
                    place,
                    age,
                    gender,
                    interested_in: interested
                }
            ])
            .single();

        if (error) throw error;

        // Create JWT token
        const token = jwt.sign({ id: newUser.id }, 'YOUR_JWT_SECRET');

        res.status(201).json({ message: 'User created successfully', token, user: newUser });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user
        const { data: user, error } = await supabase
            .from('users')
            .select()
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign({ id: user.id }, 'YOUR_JWT_SECRET');

        // Update online status
        await supabase
            .from('users')
            .update({ is_online: true })
            .eq('id', user.id);

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Get all users endpoint
app.get('/users', authenticateToken, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, place, age, gender, is_online, last_seen')
            .neq('id', req.user.id);

        if (error) throw error;

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// Get private messages endpoint
app.get('/messages/:senderId/:receiverId', authenticateToken, async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;

        const { data: messages, error } = await supabase
            .from('private_messages')
            .select()
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user-login', async (userId) => {
        socket.userId = userId;
        
        // Update user's online status
        await supabase
            .from('users')
            .update({ is_online: true })
            .eq('id', userId);

        io.emit('user-status-change', { userId, isOnline: true });
    });

    socket.on('join', (userData) => {
        socket.join('group-chat');
        socket.broadcast.to('group-chat').emit('user-joined', {
            systemMessage: `${userData.username} has joined the chat`,
            onlineCount: io.sockets.adapter.rooms.get('group-chat').size
        });
    });

    socket.on('send-message', async (message) => {
        // Store group message in database
        const { data, error } = await supabase
            .from('group_messages')
            .insert([{
                user_id: socket.userId,
                content: message.text,
                group_id: 'default-group' // You might want to make this dynamic
            }]);

        if (!error) {
            io.to('group-chat').emit('new-message', {
                id: data[0].id,
                ...message,
                timestamp: new Date()
            });
        }
    });

    socket.on('private-message', async (message) => {
        // Store private message in database
        const { data, error } = await supabase
            .from('private_messages')
            .insert([{
                sender_id: message.senderId,
                receiver_id: message.receiverId,
                content: message.text
            }]);

        if (!error) {
            io.emit('new-private-message', {
                id: data[0].id,
                ...message,
                timestamp: new Date()
            });
        }
    });

    socket.on('disconnect', async () => {
        if (socket.userId) {
            await supabase
                .from('users')
                .update({ 
                    is_online: false,
                    last_seen: new Date()
                })
                .eq('id', socket.userId);

            io.emit('user-status-change', { 
                userId: socket.userId, 
                isOnline: false,
                lastSeen: new Date()
            });
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});