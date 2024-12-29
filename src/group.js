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

// Message model
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

sequelize.sync()
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Error syncing database:', err));

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

    socket.on('disconnect', () => {
        const userData = connectedUsers.get(socket.id);
        if (userData) {
            io.emit('user-left', {
                systemMessage: `${userData.username} left the chat`,
                onlineCount: connectedUsers.size - 1
            });
            connectedUsers.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});