const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(express.json()); // Parses incoming JSON bodies
app.use(cors()); // Enables cross-origin requests

// Mount Routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Default test route
app.get('/', (req, res) => {
    res.send('API is working!');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});