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
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# GEMINI MODEL
# ============================================================

model = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite"
)


# ============================================================
# DIRECTORIES
# ============================================================

UPLOAD_DIR = Path("data/uploads")
DEFAULT_PDF = Path("data/notes.pdf")

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

    print("\n===================================")
    print("Starting DocuMind...")
    print("===================================")

    # --------------------------------------------------------
    # Try loading existing FAISS vectorstore
    # --------------------------------------------------------

    try:

        vs.load_existing_vectorstore()

        if vs.vectorstore is not None:

            print(
                "Existing FAISS vectorstore loaded successfully."
            )

        else:

            print(
                "No existing FAISS vectorstore found."
            )

    except Exception as e:

        print(
            "Could not load existing vectorstore:"
        )

        print(e)


    # --------------------------------------------------------
    # If vectorstore doesn't exist,
    # create it from data/notes.pdf
    # --------------------------------------------------------

    if vs.vectorstore is None:

        if DEFAULT_PDF.exists():

            print(
                "\nFound default PDF:"
            )

            print(
                DEFAULT_PDF
            )

            print(
                "Creating FAISS vectorstore..."
            )

            try:

                vs.create_vectorstore(
                    str(DEFAULT_PDF)
                )

                if vs.vectorstore is not None:

                    print(
                        "FAISS vectorstore created successfully."
                    )

                else:

                    print(
                        "Vectorstore creation failed."
                    )

            except Exception as e:

                print(
                    "Failed to create vectorstore:"
                )

                print(e)

        else:

            print(
                "\nNo default PDF found."
            )

            print(
                "Expected:"
            )

            print(
                DEFAULT_PDF
            )

            print(
                "Upload a PDF from the frontend."
            )


    print(
        "\nDocuMind startup complete."
    )

    print(
        "Vectorstore ready:",
        vs.vectorstore is not None
    )

    print(
        "===================================\n"
    )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "DocuMind API is running"
    }


# ============================================================
# HEALTH
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
    # Check filename
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )


    # --------------------------------------------------------
    # Check PDF
    # --------------------------------------------------------

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )


    # --------------------------------------------------------
    # Safe filename
    # --------------------------------------------------------

    filename = os.path.basename(
        file.filename
    )

    file_path = UPLOAD_DIR / filename


    try:

        # ----------------------------------------------------
        # Save PDF
        # ----------------------------------------------------

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        print(
            f"\nPDF uploaded: {file_path}"
        )


        # ----------------------------------------------------
        # Create FAISS vectorstore
        # ----------------------------------------------------

        print(
            "Creating FAISS vectorstore..."
        )

        vs.create_vectorstore(
            str(file_path)
        )


        if vs.vectorstore is None:

            raise Exception(
                "Vectorstore was not created."
            )


        print(
            "FAISS vectorstore ready."
        )


        return {

            "success": True,

            "message":
                "Document uploaded and indexed successfully.",

            "filename":
                filename

        }


    except Exception as e:

        print(
            "\nUpload error:"
        )

        print(e)


        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )


# ============================================================
# CHAT
# ============================================================

@app.post("/chat")
def chat(
    request: ChatRequest
):

    # --------------------------------------------------------
    # Get question
    # --------------------------------------------------------

    question = request.question.strip()


    # --------------------------------------------------------
    # Validate question
    # --------------------------------------------------------

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )


    # --------------------------------------------------------
    # Check vectorstore
    # --------------------------------------------------------

    if vs.vectorstore is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "No document is indexed. "
                "Please upload a PDF first."
            )
        )


    # ========================================================
    # RETRIEVAL
    # ========================================================

    print(
        f"\nQuestion: {question}"
    )

    print(
        "Searching FAISS..."
    )


    results = vs.vectorstore.similarity_search(
        question,
        k=5
    )


    print(
        f"Retrieved {len(results)} chunks."
    )


    # ========================================================
    # CREATE CONTEXT
    # ========================================================

    context_parts = []


    for doc in results:

        context_parts.append(
            doc.page_content
        )


    context = "\n\n".join(
        context_parts
    )


    # ========================================================
    # PROMPT
    # ========================================================

    prompt = f"""
You are DocuMind, an AI document assistant.

Your job is to answer the user's question using ONLY
the information contained in the provided document context.

The user wants a useful, detailed and easy-to-understand answer.

IMPORTANT RULES:

1. Use ONLY information from the document context.

2. Do NOT use outside knowledge.

3. Do NOT invent facts.

4. If the document does not contain enough information,
   clearly say that the document does not provide enough
   information to answer the question.

5. Give a detailed answer rather than a very short answer.

6. Organize the answer clearly.

7. Start with a direct explanation.

8. Use headings when the answer has multiple sections.

9. Use bullet points for lists.

10. Use numbered lists when explaining processes or steps.

11. Use tables when comparing concepts and when the
    document provides enough information.

12. Explain technical concepts in simple language.

13. Include examples ONLY when supported by the document.

14. Do not unnecessarily repeat the same information.

15. Important terms may be written in Markdown bold.

16. Keep the answer readable and well structured.

DOCUMENT CONTEXT
================

{context}


USER QUESTION
=============

{question}


Now answer the question using ONLY the document context.
"""


    # ========================================================
    # GENERATE ANSWER
    # ========================================================

    print(
        "Sending request to Gemini..."
    )


    try:

        response = model.invoke(
            prompt
        )

        answer = response.content


        # ----------------------------------------------------
        # Normalize Gemini response
        #
        # Sometimes LangChain returns:
        #
        # [
        #     {
        #         "type": "text",
        #         "text": "..."
        #     }
        # ]
        #
        # We convert that into a normal string.
        # ----------------------------------------------------

        if isinstance(answer, list):

            text_parts = []


            for item in answer:

                if isinstance(item, dict):

                    text = item.get(
                        "text"
                    )

                    if text:

                        text_parts.append(
                            text
                        )

                elif isinstance(item, str):

                    text_parts.append(
                        item
                    )


            answer = "\n".join(
                text_parts
            )


        # ----------------------------------------------------
        # Final safety conversion
        # ----------------------------------------------------

        if not isinstance(answer, str):

            answer = str(answer)


    except Exception as e:

        print(
            "\nGemini error:"
        )

        print(e)


        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to generate answer: {str(e)}"
            )
        )


    # ========================================================
    # SOURCES
    # ========================================================

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


        # ----------------------------------------------------
        # Remove duplicate sources
        # ----------------------------------------------------

        if key not in seen:

            seen.add(
                key
            )


            sources.append({

                "page":
                    str(page),

                "source":
                    str(source)

            })


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    print(
        "Answer generated successfully."
    )


    return {

        "answer":
            answer,

        "sources":
            sources

    }