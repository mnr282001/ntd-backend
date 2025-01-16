require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

const cors = require('cors');
app.use(cors());

// Import routes
const notesRoutes = require('./routes/notes');
const summariesRoutes = require('./routes/summaries');

// Use routes
app.use('/notes', notesRoutes);
app.use('/summaries', summariesRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});