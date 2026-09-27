const express = require('express');
const axios = require('axios');

const router = express.Router();

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * POST /chat/query
 * Forwards query payload { query, document_ids } to ml-service /query endpoint.
 */
router.post('/query', async (req, res) => {
  try {
    const { query, document_ids } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query string is required.' });
    }

    const mlUrl = getMlServiceUrl();
    const response = await axios.post(`${mlUrl}/query`, {
      query,
      document_ids: document_ids || null
    });

    return res.json(response.data);
  } catch (error) {
    console.error('Error in /chat/query proxying to ml-service:', error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data || error.message;
    return res.status(statusCode).json({
      error: 'Failed to process RAG query.',
      detail
    });
  }
});

module.exports = router;
