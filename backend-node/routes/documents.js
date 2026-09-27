const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const router = express.Router();

// Memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// In-memory list of uploaded documents
const DOCUMENTS = [];

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * POST /documents/upload
 * Accepts a file upload via multer and forwards it to ml-service /ingest endpoint.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || 'application/octet-stream'
    });

    const mlUrl = getMlServiceUrl();
    const response = await axios.post(`${mlUrl}/ingest`, form, {
      headers: form.getHeaders()
    });

    const { document_id, status } = response.data;

    const docRecord = {
      document_id,
      filename: req.file.originalname,
      status: status || 'processing',
      uploadedAt: new Date().toISOString()
    };

    DOCUMENTS.push(docRecord);

    return res.status(201).json(docRecord);
  } catch (error) {
    console.error('Error forwarding upload to ml-service:', error.message);
    const detail = error.response?.data || error.message;
    return res.status(500).json({ error: 'Failed to upload document to ML service.', detail });
  }
});

/**
 * GET /documents
 * Returns list of all uploaded documents with refreshed statuses from ml-service.
 */
router.get('/', async (req, res) => {
  try {
    const mlUrl = getMlServiceUrl();

    // Refresh status for documents currently in processing
    for (const doc of DOCUMENTS) {
      if (doc.status === 'processing') {
        try {
          const resp = await axios.get(`${mlUrl}/ingest/${doc.document_id}/status`);
          if (resp.data && resp.data.status) {
            doc.status = resp.data.status;
          }
        } catch (err) {
          // Keep current status if poll fails
        }
      }
    }

    return res.json(DOCUMENTS);
  } catch (error) {
    console.error('Error fetching documents list:', error.message);
    return res.status(500).json({ error: 'Failed to fetch documents list.' });
  }
});

/**
 * GET /documents/:id/status
 * Proxies ml-service status endpoint for a given document_id.
 */
router.get('/:id/status', async (req, res) => {
  const documentId = req.params.id;
  try {
    const mlUrl = getMlServiceUrl();
    const response = await axios.get(`${mlUrl}/ingest/${documentId}/status`);

    const { status } = response.data;

    // Update in-memory record if exists
    const doc = DOCUMENTS.find(d => d.document_id === documentId);
    if (doc) {
      doc.status = status;
    }

    return res.json({ document_id: documentId, status });
  } catch (error) {
    console.error(`Error fetching status for ${documentId}:`, error.message);
    const statusCode = error.response?.status || 500;
    return res.status(statusCode).json({
      error: `Failed to fetch status for document ${documentId}`,
      detail: error.response?.data || error.message
    });
  }
});

module.exports = router;
