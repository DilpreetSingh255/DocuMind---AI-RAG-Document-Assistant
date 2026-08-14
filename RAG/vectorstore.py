from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader

from RAG.splitter import split_documents
from RAG.embeddings import embedding_model


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

FAISS_DIR = BASE_DIR / "data" / "faiss_index"


# --------------------------------------------------
# Global vectorstore
# --------------------------------------------------

vectorstore = None


# --------------------------------------------------
# Create vectorstore
# --------------------------------------------------

def create_vectorstore(pdf_path: str):

    global vectorstore

    print("Creating DocuMind FAISS index...")

    # Load PDF
    print(f"Loading PDF: {pdf_path}")

    loader = PyPDFLoader(pdf_path)

    documents = loader.load()

    print(f"Loaded {len(documents)} pages")

    # Split documents
    chunks = split_documents(documents)

    print(f"Created {len(chunks)} chunks")

    # Create FAISS index
    vectorstore = FAISS.from_documents(
        chunks,
        embedding_model
    )

    # Create directory
    FAISS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # Save index
    vectorstore.save_local(
        str(FAISS_DIR)
    )

    print("FAISS vectorstore created successfully")

    return vectorstore


# --------------------------------------------------
# Load existing vectorstore
# --------------------------------------------------

def load_existing_vectorstore():

    global vectorstore

    if not FAISS_DIR.exists():

        print("No existing vectorstore found")

        vectorstore = None

        return None

    try:

        print("Loading existing FAISS vectorstore...")

        vectorstore = FAISS.load_local(
            str(FAISS_DIR),
            embedding_model,
            allow_dangerous_deserialization=True
        )

        print("Existing FAISS vectorstore loaded")

        return vectorstore

    except Exception as e:

        print("Could not load existing vectorstore:")

        print(e)

        vectorstore = None

        return None