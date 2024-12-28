const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const sequelize = new Sequelize('user_db', 'your_username', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false,
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
});

// Sync the database, ensuring all models are properly initialized
sequelize.sync()
    .then(() => {
        console.log('Database synced');
    })
    .catch((error) => {
        console.error('Error syncing database:', error);
    });

// Sign up route to create a new user
app.post('/signup', async (req, res) => {
    const { username, email, password, place, age, gender, interested } = req.body;

    // Validate all required fields
    if (!username || !email || !password || !place || !age || !gender || !interested) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if the user already exists by email
        const userExists = await User.findOne({ where: { email } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create a new user in the database
        const newUser = await User.create({
            username,
            email,
            password,
            place,
            age,
            gender,
            interested,
        });

        // Respond with success message
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
