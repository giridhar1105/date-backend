const express = require('express');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressJwt = require('express-jwt');  // JWT middleware

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// JWT secret key (ensure you store this securely in production)
const JWT_SECRET = 'your_jwt_secret_key';

// Database setup (example using Sequelize)
const sequelize = new Sequelize('user_db', 'your_username', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false,
});

// Define the User model (extend with more fields if needed)
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
});

// Sync the database
sequelize.sync()
    .then(() => {
        console.log('Database synced');
    })
    .catch((error) => {
        console.error('Error syncing database:', error);
    });

// JWT authentication middleware
const authenticateJWT = expressJwt({
    secret: JWT_SECRET,
    algorithms: ['HS256'],
});

// Example login route to generate a JWT (for testing purposes)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Profile route - protected
app.get('/profile', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id; // Extract user ID from JWT payload

        const user = await User.findByPk(userId); // Fetch user by ID

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            user: {
                username: user.username,
                email: user.email,
                place: user.place,
                age: user.age,
                gender: user.gender,
                interested: user.interested,
                profileImage: user.profileImage || "default_image_url_here.jpg", // If you want to add a profile image field
            },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
