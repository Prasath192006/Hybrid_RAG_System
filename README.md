# Hybrid RAG System - Monorepo

This repository contains the monorepo structure for the Retrieval-Augmented Generation (RAG) final year project.

## Project Structure

```
rag-app/
├── frontend/          # React + Vite web user interface
├── backend-node/      # Node.js + Express API Gateway / Server
├── ml-service/        # Python + FastAPI machine learning service
├── .gitignore         # Monorepo git ignore rules
└── README.md          # Project documentation
```

## Services Overview

1. **Frontend (`frontend/`)**: React application bundled with Vite. Serves as the web UI for interacting with the RAG system.
2. **Backend Node (`backend-node/`)**: Express API server managing authentication, HTTP endpoints, file uploads (multer), and orchestration.
3. **ML Service (`ml-service/`)**: FastAPI service responsible for model inference, document parsing, embeddings, and vector database retrieval.

---

## How to Run in Development Mode

### 1. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
* Default URL: `http://localhost:3000`

### 2. Backend Node (Express API)
```bash
cd backend-node
npm install
npm run dev
```
* Default URL: `http://localhost:5000`
* Health Check: GET `http://localhost:5000/health` -> `{"status":"ok"}`

### 3. ML Service (FastAPI)
```bash
cd ml-service
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
* Default URL: `http://localhost:8000`
* Health Check: GET `http://localhost:8000/health` -> `{"status":"ok"}`
