import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_community.document_loaders import GitLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OllamaEmbeddings
from langchain.vectorstores import FAISS
import requests
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
import subprocess
app = FastAPI(title="GitHub RAG Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or replace "*" with ["http://localhost:3000"] for stricter access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory to store cloned repos and FAISS indexes
REPO_ROOT = Path("./repos")
INDEX_ROOT = Path("./faiss_indexes")
REPO_ROOT.mkdir(parents=True, exist_ok=True)
INDEX_ROOT.mkdir(parents=True, exist_ok=True)

# Pydantic models
class BuildRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = None
    chunk_size: int = 800
    chunk_overlap: int = 100

class QueryRequest(BaseModel):
    repo_url: str
    question: str
    k: int = 5


def get_repo_name(repo_url: str) -> str:
    return Path(repo_url.rstrip("/.")).stem

def get_default_branch(repo_url: str) -> str:
    """
    Returns the actual default branch of a GitHub repo, e.g. 'main', 'master' or any custom name.
    1. Uses `git ls-remote --symref HEAD` to see where HEAD points.
    2. If that fails, lists all branches and picks the first one.
    """
    # 1️⃣ Try to read the symbolic HEAD ref directly
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--symref", repo_url, "HEAD"],
            capture_output=True,
            text=True,
            check=True
        )
        for line in result.stdout.splitlines():
            if line.startswith("ref:"):
                # line looks like: "ref: refs/heads/custom-branch HEAD"
                return line.split()[1].rsplit("/", 1)[-1]
    except subprocess.CalledProcessError:
        # Couldn’t resolve symref (rare), fall back
        pass

    # 2️⃣ Fallback: list all remote heads and pick the first one
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--heads", repo_url],
            capture_output=True,
            text=True,
            check=True
        )
        # Parse lines like: "<hash>\trefs/heads/branch-name"
        branches = [
            ref.split("/")[-1]
            for ref in (line.split()[1] for line in result.stdout.splitlines())
            if ref.startswith("refs/heads/")
        ]
        if branches:
            return branches[0]
    except subprocess.CalledProcessError:
        pass

    # 3️⃣ As a very last resort (should rarely hit this):
    return "master"


@app.post("/build")
def build_index(req: BuildRequest):
    repo_name = get_repo_name(req.repo_url)
    local_path = REPO_ROOT / repo_name
    index_path = INDEX_ROOT / repo_name
   
    try:
        # 🌿 Automatically resolve branch if not provided
        branch =get_default_branch(req.repo_url)
        print(f"🌿 Using branch: {branch}")
        print("⏳ Cloning repo...")

        loader = GitLoader(
            clone_url=req.repo_url,
            repo_path=str(local_path),
            branch=branch,
            file_filter=lambda f: not any(part.startswith('.') for part in Path(f).parts)
        )
        docs = loader.load()
        print(f"✅ Loaded {len(docs)} files.")

        if not docs:
            raise ValueError("❌ No matching source code files found in repo.")

        splitter = CharacterTextSplitter(
            chunk_size=req.chunk_size,
            chunk_overlap=req.chunk_overlap,
            length_function=len
        )
        chunks = splitter.split_documents(docs)
        print(f"📄 Total chunks: {len(chunks)}")

        if not chunks:
            raise ValueError("❌ No chunks generated. Check if files are empty.")

        embedder = OllamaEmbeddings(model="mxbai-embed-large")
        vectorstore = FAISS.from_documents(chunks, embedding=embedder)
        vectorstore.save_local(str(index_path))

        return {"status": "success", "repo": repo_name, "index_path": str(index_path)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
def query_index(req: QueryRequest):
    """
    Query the FAISS index for a given question, then ask LLM with retrieved context.
    """
    repo_name = get_repo_name(req.repo_url)
    index_path = INDEX_ROOT / repo_name
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Index not found. Please build first.")
    try:
        # Load index
        embedder = OllamaEmbeddings(model="mxbai-embed-large")
        vectorstore = FAISS.load_local(
            str(index_path),
            embeddings=embedder,
            allow_dangerous_deserialization=True
        )
        retriever = vectorstore.as_retriever(search_type="similarity", k=req.k)
        docs = retriever.get_relevant_documents(req.question)
        context = "\n\n".join([d.page_content for d in docs])

        # Call LLM
        prompt = f"""
You are a helpful assistant with knowledge of the following GitHub repo.

Context:
{context}

Based on the context above, answer this question:
{req.question}
"""
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False}
        )
        response.raise_for_status()
        answer = response.json().get("response", "")
        return {"answer": answer, "source_chunks": [d.metadata.get("file_path") for d in docs]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting FastAPI on http://0.0.0.0:8000 …")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
# To run this app, use the command: