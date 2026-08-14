from RAG.vectorstore import vectorstore
results = vectorstore.similarity_search(
    "explain relational database",
    k=3
)
