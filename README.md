# Git Summary
# Git Summarizer 

A simple tool that lets you **ask questions about any GitHub repo**.

It clones the repository, reads the files, indexes them using embeddings, and then lets you ask questions in natural language — like “What does this repo do?” or “Where is the login logic?”

---

## Features

- Clones any public Git repo
- Reads and indexes the code and docs
- Lets you ask natural language questions about the repo
- Uses FAISS + LLMs for retrieval and answering

---

## How It Works

1. You send a repo URL to the API.
2. It clones the repo and extracts all readable files.
3. It creates embeddings and stores them in a FAISS index.
4. When you ask a question, it retrieves the most relevant chunks and sends them to the LLM to answer.

---

## Getting Started

### Install

```bash
git clone https://github.com/your-username/git-summarizer.git
cd git-summarizer
pip install -r requirements.txt
