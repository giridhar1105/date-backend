const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Database configuration
const sequelize = new Sequelize('user_db', 'your_username', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false
});

// Private Message model
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

// Add online status to User model
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

// Sync database
sequelize.sync()
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Error syncing database:', err));

// Store connected users
const connectedUsers = new Map();

// Get all users
app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'age', 'gender', 'place', 'isOnline', 'lastSeen']
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get chat history
app.get('/messages/:senderId/:receiverId', async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;
        const messages = await PrivateMessage.findAll({
            where: {
                [Sequelize.Op.or]: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            },
            order: [['timestamp', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user login
    socket.on('user-login', async (userId) => {
        connectedUsers.set(socket.id, userId);
        
        // Update user status in database
        try {
            await User.update(
                { isOnline: true },
                { where: { id: userId } }
            );
            io.emit('user-status-change', { userId, isOnline: true });
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    });

    // Handle private messages
    socket.on('private-message', async (data) => {
        try {
            const message = await PrivateMessage.create({
                senderId: data.senderId,
                receiverId: data.receiverId,
                text: data.text
            });

            // Send to both sender and receiver
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

    // Handle disconnection
    socket.on('disconnect', async () => {
        const userId = connectedUsers.get(socket.id);
        if (userId) {
            try {
                await User.update(
                    { 
                        isOnline: false,
                        lastSeen: new Date()
                    },
                    { where: { id: userId } }
                );
                io.emit('user-status-change', { 
                    userId, 
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});