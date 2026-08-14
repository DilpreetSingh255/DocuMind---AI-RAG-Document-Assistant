# 🧠 DocuMind — AI RAG Document Assistant

DocuMind is an AI-powered document assistant that allows users to upload PDF documents and ask questions about their content using natural language.

It uses **Retrieval-Augmented Generation (RAG)** to retrieve relevant information from uploaded documents and generate detailed, document-grounded answers using Google Gemini.

---

## ✨ Features

- 📄 Upload PDF documents
- 💬 Ask questions about uploaded documents
- 🔎 Semantic similarity search
- 🧠 Retrieval-Augmented Generation (RAG)
- 🤖 Google Gemini-powered answers
- 📚 Source and page references
- ⚡ FAISS vector database
- 🔤 Hugging Face sentence embeddings
- 🎨 Modern dark-themed React interface
- 🚀 FastAPI backend
- 🔐 Environment-based API key configuration
- 📝 Detailed and structured AI responses
- 📌 Document-grounded answers to reduce hallucinations

---

# 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │        User          │
                         │                      │
                         │ Upload PDF / Ask     │
                         │      Question        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    React Frontend    │
                         │        Vite          │
                         │     Tailwind CSS     │
                         └──────────┬───────────┘
                                    │
                              HTTP Requests
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    FastAPI Backend   │
                         │       Python         │
                         └──────────┬───────────┘
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
              ┌─────────────────┐      ┌─────────────────┐
              │ PDF Processing  │      │  User Question  │
              │     PyPDF       │      │                 │
              └────────┬────────┘      └────────┬────────┘
                       │                         │
                       ▼                         ▼
              ┌─────────────────┐      ┌─────────────────┐
              │ Text Chunking   │      │ Question Search │
              └────────┬────────┘      └────────┬────────┘
                       │                         │
                       ▼                         │
              ┌─────────────────┐                │
              │ Hugging Face    │                │
              │   Embeddings    │                │
              └────────┬────────┘                │
                       │                         │
                       ▼                         ▼
              ┌──────────────────────────────────────┐
              │                FAISS                  │
              │             Vector Store             │
              └──────────────────┬───────────────────┘
                                 │
                          Relevant Chunks
                                 │
                                 ▼
                       ┌─────────────────────┐
                       │    Google Gemini    │
                       │        LLM          │
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │  Grounded Answer    │
                       │    + Sources        │
                       └─────────────────────┘

