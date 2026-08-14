from RAG.vectorstore import create_vectorstore


PDF_PATH = "data/notes.pdf"


print("Creating DocuMind FAISS index...")

create_vectorstore(PDF_PATH)

print("Done!")