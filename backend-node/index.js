const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const documentsRouter = require('./routes/documents');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allows React frontend dev server requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/documents', documentsRouter);
app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend Express server running on port ${PORT}`);
});
