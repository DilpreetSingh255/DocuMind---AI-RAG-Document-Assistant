import os

from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from RAG.embeddings import embedding_model


VECTORSTORE_PATH = "data/faiss_index"

# Current active vectorstore
vectorstore = None


def create_vectorstore(pdf_path: str):
    global vectorstore

    print(f"Loading PDF: {pdf_path}")

    # Load PDF
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    print(f"Loaded {len(documents)} pages")

    # Split documents
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(documents)

    print(f"Created {len(chunks)} chunks")

    # Create FAISS vectorstore
    vectorstore = FAISS.from_documents(
        chunks,
        embedding_model
    )

    # Save locally
    os.makedirs("data", exist_ok=True)

    vectorstore.save_local(VECTORSTORE_PATH)

    print("FAISS vectorstore created successfully")

    return vectorstore


def load_existing_vectorstore():

    global vectorstore

    if os.path.exists(VECTORSTORE_PATH):

        print("Loading existing FAISS vectorstore...")

        vectorstore = FAISS.load_local(
            VECTORSTORE_PATH,
            embedding_model,
            allow_dangerous_deserialization=True
        )

        print("FAISS vectorstore loaded")

        return vectorstore

    print("No existing vectorstore found")

    return None