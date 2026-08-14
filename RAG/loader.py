from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("data/notes.pdf")

documents = loader.load()

