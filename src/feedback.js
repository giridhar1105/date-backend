const { Pool } = require('pg');
const express = require('express');

const router = express.Router();

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

// Create feedback table if it doesn't exist
const createTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            rating INTEGER NOT NULL,
            feedback_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    try {
        await pool.query(createTableQuery);
        console.log('Feedback table created successfully');
    } catch (error) {
        console.error('Error creating table:', error);
    }
};

createTable();

// POST endpoint to save feedback
router.post('/api/feedback', async (req, res) => {
    const { rating, feedback } = req.body;

    if (!rating) {
        return res.status(400).json({ error: 'Rating is required' });
    }

    try {
        const query = 'INSERT INTO feedback (rating, feedback_text) VALUES ($1, $2) RETURNING *';
        const values = [rating, feedback];
        const result = await pool.query(query, values);
        
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to retrieve all feedback
router.get('/api/feedback', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error retrieving feedback:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;