from flask import Flask, request, jsonify
from flask_cors import CORS
import chromadb
import uuid, time, hashlib

app = Flask(__name__)
CORS(app)

client = chromadb.PersistentClient(path="./loma_memory_db")
collection = client.get_or_create_collection("loma_memories")

def simple_embed(text):
    words = text.lower().split()
    vec = [0.0] * 384
    for i, w in enumerate(words):
        h = int(hashlib.md5(w.encode()).hexdigest(), 16)
        vec[h % 384] += 1.0 / (i + 1)
    norm = sum(x**2 for x in vec) ** 0.5
    return [x / (norm or 1) for x in vec]

@app.route('/save', methods=['POST'])
def save():
    data = request.json
    fact = data.get('fact', '')
    if not fact: return jsonify({'ok': False})
    emb = simple_embed(fact)
    collection.add(
        documents=[fact],
        embeddings=[emb],
        ids=[f"mem_{uuid.uuid4().hex}"],
        metadatas=[{"ts": data.get('ts', int(time.time()*1000))}]
    )
    return jsonify({'ok': True})

@app.route('/recall', methods=['POST'])
def recall():
    data = request.json
    query = data.get('query', '')
    top_k = data.get('top_k', 10)
    if not query: return jsonify({'memories': []})
    count = collection.count()
    if count == 0: return jsonify({'memories': []})
    emb = simple_embed(query)
    results = collection.query(query_embeddings=[emb], n_results=min(top_k, count))
    memories = results['documents'][0] if results['documents'] else []
    return jsonify({'memories': memories})

if __name__ == '__main__':
    print("Loma Memory Server running on http://127.0.0.1:8765")
    app.run(port=8765, debug=False)