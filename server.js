// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const { Sequelize, DataTypes } = require('sequelize');

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(bodyParser.json());

// const sequelize = new Sequelize('user_db', 'your_username', 'your_password', {
//     host: 'localhost',
//     dialect: 'postgres',
//     logging: false,
// });

// const User = sequelize.define('User', {
//     username: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//     },
//     password: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
// });

// sequelize.sync()
//     .then(() => {
//         console.log('Database synced');
//     })
//     .catch((error) => {
//         console.error('Error syncing database:', error);
//     });

// app.post('/signup', async (req, res) => {
//     const { username, email, password } = req.body;

//     if (!username || !email || !password) {
//         return res.status(400).json({ message: 'All fields are required' });
//     }

//     try {
//         const userExists = await User.findOne({ where: { email } });

//         if (userExists) {
//             return res.status(400).json({ message: 'User already exists' });
//         }

//         const newUser = await User.create({ username, email, password });

//         return res.status(201).json({ message: 'User created successfully', user: newUser });
//     } catch (error) {
//         console.error('Error creating user:', error);
//         return res.status(500).json({ message: 'Server error' });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });




const express = require('express');
const cors = require('cors');
const axios = require('axios'); 

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); 
app.use(express.json()) 

app.post('/gemini-1.5-flash', async (req, res) => {
  const { input, timestamp } = req.body;
const Prompt = `talk friendly.`
;
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Invalid input text' });
  }

  try {
    const geminiApiResponse = await processWithGemini(Prompt,input);

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

async function processWithGemini(Prompt , input) {
    try {
      const response = await axios({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyBrS_O-7eVZx77WnjdsNhfFDBvxqA6VVGw`,
        method: "post",
        data: {
          contents: [{ parts: [{ text: Prompt + input }] }],
        },
      });
 const aiResponse = response.data.candidates[0].content.parts[0].text;
 console.log(aiResponse)
      return aiResponse;
    } catch (error) {
      console.error('Error in calling Gemini 1.5 Flash API:', error);
      console.error('Server Response:', error.response.data); 
      throw new Error('Failed to process the request');
    }
  }

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});