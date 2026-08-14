import os
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI

import RAG.vectorstore as vs


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="DocuMind API",
    description="Backend API for DocuMind RAG Assistant",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# GEMINI CHAT MODEL
# ============================================================

model = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite"
)


# ============================================================
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = Path("data/uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# REQUEST MODEL
# ============================================================

class ChatRequest(BaseModel):
    question: str


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    print("Starting DocuMind...")

    try:

        vs.load_existing_vectorstore()

        if vs.vectorstore is not None:

            print("Existing RAG index loaded successfully")

        else:

            print("No existing RAG index found")

    except Exception as e:

        print("Could not load existing vectorstore:")
        print(e)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "DocuMind API is running"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "vectorstore_ready": vs.vectorstore is not None
    }


# ============================================================
# UPLOAD PDF
# ============================================================

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # Validate file
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected"
        )


    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )


    # --------------------------------------------------------
    # Safe filename
    # --------------------------------------------------------

    filename = os.path.basename(file.filename)

    file_path = UPLOAD_DIR / filename


    try:

        # ----------------------------------------------------
        # Save uploaded PDF
        # ----------------------------------------------------

        with open(file_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        print(f"PDF saved: {file_path}")


        # ----------------------------------------------------
        # Create / rebuild FAISS vectorstore
        # ----------------------------------------------------

        vs.create_vectorstore(
            str(file_path)
        )


        return {

            "success": True,

            "message": "Document uploaded and indexed successfully",

            "filename": filename

        }


    except Exception as e:

        print("Upload error:")
        print(e)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )


# ============================================================
# CHAT
# ============================================================

@app.post("/chat")
def chat(request: ChatRequest):

    question = request.question.strip()


    # --------------------------------------------------------
    # Validate question
    # --------------------------------------------------------

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )


    # --------------------------------------------------------
    # Check vectorstore
    # --------------------------------------------------------

    if vs.vectorstore is None:

        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF before asking questions."
        )


    # --------------------------------------------------------
    # Retrieve relevant chunks
    # --------------------------------------------------------

    try:

        results = vs.vectorstore.similarity_search(
            question,
            k=5
        )

    except Exception as e:

        print("Retrieval error:")
        print(e)

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve relevant document information."
        )


    # --------------------------------------------------------
    # Create document context
    # --------------------------------------------------------

    context = "\n\n".join(
        doc.page_content
        for doc in results
    )


    # --------------------------------------------------------
    # Prompt
    # --------------------------------------------------------

    prompt = f"""
You are DocuMind, an AI document assistant.

Answer the user's question using ONLY the information
contained in the provided document context.

Give a detailed, clear and well-structured answer.

Rules:

- Start with a clear direct explanation.
- Use headings when appropriate.
- Use bullet points for lists.
- Use numbered lists when explaining steps.
- Use tables when the document contains comparison information.
- Explain technical terms in simple language.
- Give examples only when supported by the document.
- Do not invent information.
- Do not use information outside the provided context.
- Do not unnecessarily repeat information.
- Give enough detail to properly answer the question.
- Keep the answer focused on the user's question.

If the document does not contain enough information,
say clearly:

"The provided document does not contain enough information
to answer this question."

DOCUMENT CONTEXT:

{context}


USER QUESTION:

{question}


Now provide a detailed answer based strictly on the document.
"""


    # --------------------------------------------------------
    # Generate answer
    # --------------------------------------------------------

    try:

        response = model.invoke(prompt)

        answer = response.content

    except Exception as e:

        print("Gemini error:")
        print(e)

        raise HTTPException(
            status_code=500,
            detail="Failed to generate an answer."
        )


    # --------------------------------------------------------
    # Sources
    # --------------------------------------------------------

    sources = []

    seen = set()


    for doc in results:

        page = doc.metadata.get(
            "page_label",
            str(
                doc.metadata.get(
                    "page",
                    ""
                )
            )
        )


        source = doc.metadata.get(
            "source",
            "Uploaded document"
        )


        key = (
            str(page),
            str(source)
        )


        if key not in seen:

            seen.add(key)

            sources.append({

                "page": page,

                "source": source

            })


    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {

        "answer": answer,

        "sources": sources

    }