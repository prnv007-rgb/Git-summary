import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_community.document_loaders import GitLoader
from langchain.text_splitter import CharacterTextSplitter
# NEW: Import Cohere for embeddings and Groq for chat
from langchain_cohere import CohereEmbeddings
from langchain_groq import ChatGroq
from langchain.vectorstores import FAISS
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
import subprocess

app = FastAPI(title="GitHub RAG Service")

# --- IMPORTANT: SECURE CORS SETTINGS ---
# Using your specific Vercel URL is more secure than a wildcard.
origins = [
    "https://git-summary-wyrc.vercel.app",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory to store cloned repos and FAISS indexes
REPO_ROOT = Path("./repos")
INDEX_ROOT = Path("./faiss_indexes")
REPO_ROOT.mkdir(parents=True, exist_ok=True)
INDEX_ROOT.mkdir(parents=True, exist_ok=True)

# Pydantic models for request data
class BuildRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = None
    chunk_size: int = 800
    chunk_overlap: int = 100

class QueryRequest(BaseModel):
    repo_url: str
    question: str
    k: int = 5

# Helper functions to get repo name and default branch
def get_repo_name(repo_url: str) -> str:
    return Path(repo_url.rstrip("/.")).stem

def get_default_branch(repo_url: str) -> str:
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--symref", repo_url, "HEAD"],
            capture_output=True, text=True, check=True, timeout=30
        )
        for line in result.stdout.splitlines():
            if line.startswith("ref:"):
                return line.split()[1].rsplit("/", 1)[-1]
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        pass
    return "main"

# Root endpoint for health checks
@app.get("/")
def read_root():
    return {"message": "RAG Backend is running!"}

# --- UPDATED /build ENDPOINT ---
@app.post("/build")
def build_index(req: BuildRequest):
    repo_name = get_repo_name(req.repo_url)
    local_path = REPO_ROOT / repo_name
    index_path = INDEX_ROOT / repo_name
    
    try:
        branch = get_default_branch(req.repo_url)
        print(f"🌿 Using branch: {branch}")
        print("⏳ Cloning repo...")

        loader = GitLoader(
            clone_url=req.repo_url, repo_path=str(local_path), branch=branch,
            file_filter=lambda f: not any(part.startswith('.') for part in Path(f).parts)
        )
        docs = loader.load()
        print(f"✅ Loaded {len(docs)} files.")

        if not docs:
            raise ValueError("❌ No matching source code files found in repo.")

        splitter = CharacterTextSplitter(
            chunk_size=req.chunk_size, chunk_overlap=req.chunk_overlap
        )
        chunks = splitter.split_documents(docs)
        print(f"📄 Total chunks: {len(chunks)}")

        if not chunks:
            raise ValueError("❌ No chunks generated.")

        # NEW: Use the Cohere embedding model via API
        # This will automatically use the COHERE_API_KEY from your Render environment
        embedder = CohereEmbeddings(model="embed-english-light-v3.0")
        
        vectorstore = FAISS.from_documents(chunks, embedding=embedder)
        vectorstore.save_local(str(index_path))

        return {"status": "success", "repo": repo_name, "index_path": str(index_path)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- UPDATED /query ENDPOINT ---
@app.post("/query")
def query_index(req: QueryRequest):
    repo_name = get_repo_name(req.repo_url)
    index_path = INDEX_ROOT / repo_name
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Index not found. Please build first.")
    
    try:
        # Load index with the same Cohere embedding model
        embedder = CohereEmbeddings(model="embed-english-light-v3.0")
        vectorstore = FAISS.load_local(
            str(index_path),
            embeddings=embedder,
            allow_dangerous_deserialization=True
        )
        retriever = vectorstore.as_retriever(search_type="similarity", k=req.k)
        docs = retriever.get_relevant_documents(req.question)
        context = "\n\n".join([d.page_content for d in docs])

        # Call the Groq LLM using the API key from the environment
        llm = ChatGroq(model_name="llama3-8b-8192", temperature=0)
        
        prompt = f"""
You are a helpful assistant with knowledge of the following GitHub repo.

Context:
{context}

Based on the context above, answer this question:
{req.question}
"""
        answer = llm.invoke(prompt).content
        
        return {"answer": answer, "source_chunks": [d.metadata.get("file_path") for d in docs]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting FastAPI on http://0.0.0.0:8000 …")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
