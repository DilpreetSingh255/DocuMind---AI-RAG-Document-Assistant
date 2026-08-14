from dotenv import load_dotenv
from RAG.vectorstore import vectorstore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

model = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite"
)

retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3}
)

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful document assistant.

Answer the user's question using ONLY the provided context.

If the answer cannot be found in the context,
say that the information is not available in the document.

Context:
{context}"""
    ),
    ("human", "{question}")
])


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


rag_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | prompt
    | model
    | StrOutputParser()
)


question = "Explain relational database"

answer = rag_chain.invoke(question)

print(answer)