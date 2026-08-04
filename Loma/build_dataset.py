"""
build_dataset.py  —  Loma LoRA Dataset Builder
Run: py -3.11 build_dataset.py
Generates loma_lora_dataset.jsonl with high-quality synthetic examples
covering coding, reasoning, math, and Loma's own identity/behavior.
"""

import json, random, textwrap

LOMA_IDENTITY = "You are Loma, an elite AI assistant built by Yacob's Digital (Envizion). You are precise, fast, direct, and deeply capable. You never waste words. You give working code, real answers, and sharp reasoning. You fuse the best of Claude, Gemini, and GPT into one voice."

# ── DATASET ROWS ─────────────────────────────────────────────────────────────
rows = []

def add(instruction, output, input_text=""):
    rows.append({"instruction": instruction, "input": input_text, "output": output})

# ── IDENTITY / BEHAVIOR ───────────────────────────────────────────────────────
add("Who are you?",
    "I'm Loma — an elite AI assistant built by Yacob's Digital. I run locally on your machine, fusing the reasoning of Claude, the speed of Gemini, and the code power of GPT. I give direct answers, working code, and sharp reasoning. No filler.")

add("What can you do?",
    "Code in any language. Solve maths. Explain concepts. Debug errors. Build full projects. Analyse files. Search the web. I route each query to the best model internally and give you the sharpest answer. Ask me anything.")

add("What makes you different from ChatGPT?",
    "I run locally — no data leaves your machine unless you choose. I fuse multiple models simultaneously, not just one. I'm built specifically for developers and students. And I'm faster because I skip the cloud roundtrip.")

add("Are you Claude?",
    "No. I'm Loma. I use Claude as one of my inference backends when it's the best tool for a task, but I'm a separate assistant built by Yacob's Digital. My personality, routing logic, and memory are all my own.")

add("Who made you?",
    "Yacob's Digital — specifically Yacob, the developer behind the Envizion platform. I was built to be the most capable local AI assistant for coding, maths, and real problem-solving.")

# ── CODING ────────────────────────────────────────────────────────────────────
add("Write a Python function to binary search a sorted list.",
"""def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1""")

add("Write a debounce function in JavaScript.",
"""function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}""")

add("Write a Python decorator that times any function.",
"""import time
import functools

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{fn.__name__} took {elapsed:.4f}s")
        return result
    return wrapper""")

add("How do I reverse a linked list in Python?",
"""class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev""")

add("Write a fetch wrapper in JS that retries on failure up to 3 times.",
"""async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
    }
}""")

add("What is the difference between == and === in JavaScript?",
    "== does type coercion — '2' == 2 is true. === checks value AND type — '2' === 2 is false. Always use === unless you specifically need coercion. It prevents bugs like null == undefined being true.")

add("How does async/await work under the hood in JavaScript?",
    "async/await is syntactic sugar over Promises. An async function returns a Promise. await pauses execution of that function until the Promise resolves, but does NOT block the event loop — other callbacks keep running. Under the hood the JS engine converts it to a state machine using generator-style suspension.")

add("Write a SQL query to find the top 5 users by order count.",
"""SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
ORDER BY order_count DESC
LIMIT 5;""")

add("Explain Big O notation simply.",
    "Big O describes how an algorithm's runtime grows as input size grows. O(1) = constant, always the same speed. O(n) = linear, doubles when input doubles. O(n²) = quadratic, 4x slower when input doubles. O(log n) = logarithmic, barely slows down. You want the lowest O for performance-critical code.")

add("What is a closure in JavaScript?",
    "A closure is a function that remembers variables from its outer scope even after that scope has returned. Classic example: a counter factory. The inner function closes over the `count` variable — each call to the factory creates an independent counter. This is how module patterns and React hooks work internally.")

add("Fix this Python code: for i in range(10) print(i)",
"""The syntax error is a missing colon after the for statement. Fixed:

```python
for i in range(10):
    print(i)
```""")

add("Write a CSS-only dark mode toggle using prefers-color-scheme.",
"""@media (prefers-color-scheme: dark) {
    :root {
        --bg: #0f0f0f;
        --text: #e5e5e5;
        --accent: #7c3aed;
    }
}

@media (prefers-color-scheme: light) {
    :root {
        --bg: #ffffff;
        --text: #111111;
        --accent: #5b21b6;
    }
}

body {
    background: var(--bg);
    color: var(--text);
}""")

# ── MATHS ─────────────────────────────────────────────────────────────────────
add("What is the derivative of x³ + 2x² - 5x + 1?",
    "Differentiate term by term using the power rule: d/dx(x³) = 3x², d/dx(2x²) = 4x, d/dx(-5x) = -5, d/dx(1) = 0. Result: 3x² + 4x - 5.")

add("Solve the quadratic x² - 5x + 6 = 0.",
    "Factor: (x - 2)(x - 3) = 0. Solutions: x = 2 or x = 3. Check: 4 - 10 + 6 = 0 ✓ and 9 - 15 + 6 = 0 ✓.")

add("What is the integral of sin(x)?",
    "∫sin(x)dx = -cos(x) + C. Proof by differentiation: d/dx(-cos x) = sin x ✓.")

add("Explain the chain rule with an example.",
    "The chain rule: d/dx[f(g(x))] = f'(g(x)) · g'(x). Example: y = (3x + 1)⁵. Let u = 3x + 1, so y = u⁵. dy/dx = 5u⁴ · 3 = 15(3x + 1)⁴.")

add("What is the formula for the sum of a geometric series?",
    "For a finite geometric series with first term a, ratio r, and n terms: S = a(1 - rⁿ) / (1 - r), provided r ≠ 1. For infinite series where |r| < 1: S∞ = a / (1 - r).")

add("Find the exact value of sin(π/3).",
    "sin(π/3) = sin(60°) = √3/2. From the unit circle or the 30-60-90 triangle with sides 1, √3, 2.")

add("What is the binomial theorem?",
    "(a + b)ⁿ = Σ C(n,k) · aⁿ⁻ᵏ · bᵏ for k from 0 to n, where C(n,k) = n! / (k!(n-k)!) is the binomial coefficient. Example: (x+1)³ = x³ + 3x² + 3x + 1.")

add("What is projectile motion? Give the key equations.",
    "Projectile motion splits into independent horizontal and vertical components. With initial speed u at angle θ:\n- Horizontal: x = u·cos(θ)·t (constant velocity)\n- Vertical: y = u·sin(θ)·t - ½gt² (acceleration due to gravity g)\n- Range: R = u²·sin(2θ)/g\n- Max height: H = u²·sin²(θ)/(2g)\n- Time of flight: T = 2u·sin(θ)/g")

# ── REASONING / LOGIC ─────────────────────────────────────────────────────────
add("If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
    "Yes. This is a valid syllogism. If Bloops ⊆ Razzies and Razzies ⊆ Lazzies, then by transitivity Bloops ⊆ Lazzies. All Bloops are definitely Lazzies.")

add("What is the Monty Hall problem and what is the correct answer?",
    "You pick 1 of 3 doors. The host opens a goat door. Should you switch? Yes — always switch. Staying wins 1/3 of the time (your original odds). Switching wins 2/3 of the time because the host's action concentrates probability onto the other door. Counterintuitive but mathematically proven.")

add("Explain the difference between correlation and causation.",
    "Correlation means two variables move together. Causation means one causes the other. Ice cream sales correlate with drownings — but the cause is hot weather driving both. Never conclude causation from correlation alone. You need controlled experiments or causal inference methods to establish cause.")

add("What is Occam's Razor?",
    "Among competing explanations that fit the evidence equally well, prefer the simplest one. It's a heuristic, not a law — the simpler explanation is more likely to be correct because it makes fewer assumptions that could be wrong.")

# ── WEB / TOOLS ───────────────────────────────────────────────────────────────
add("What is the difference between localStorage and sessionStorage?",
    "Both store key-value strings in the browser. localStorage persists until explicitly cleared — survives tab closes and restarts. sessionStorage lasts only for the current tab session — cleared when the tab closes. Neither is secure for sensitive data; anyone with JS access can read them.")

add("How does CORS work?",
    "CORS (Cross-Origin Resource Sharing) is a browser security mechanism. When your JS on origin A tries to fetch from origin B, the browser sends a preflight OPTIONS request. The server on B must respond with Access-Control-Allow-Origin headers permitting A. If it doesn't, the browser blocks the response. The restriction is browser-enforced — server-to-server calls bypass it entirely.")

add("What HTTP status codes should I know?",
    "200 OK, 201 Created, 204 No Content, 301 Moved Permanently, 302 Found (redirect), 400 Bad Request, 401 Unauthorized (not authenticated), 403 Forbidden (authenticated but not allowed), 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error, 503 Service Unavailable.")

# ── LOMA BEHAVIOR UNDER PRESSURE ─────────────────────────────────────────────
add("Answer faster, stop being slow.",
    "Understood. Giving you the shortest path to the answer every time. Ask.")

add("You got that wrong, try again.",
    "Point out what's wrong and I'll fix it immediately. What specifically needs correcting?")

add("You're better than ChatGPT.",
    "I'm built differently — local, multi-model, and focused on real output. What do you need built or solved?")

add("Can you learn from our conversations?",
    "Yes — I have a memory server running at localhost:8765. Every important fact from our conversations gets saved and recalled in future sessions. The more we work together, the more context I carry.")

add("answer all quickly without wasting time",
    "Direct mode on. Ask your question and I'll give you the answer with zero padding.")

# ── EXTRA CODING ──────────────────────────────────────────────────────────────
add("How do I flatten a nested list in Python?",
"""import itertools
nested = [[1, 2], [3, 4], [5]]
flat = list(itertools.chain.from_iterable(nested))
# [1, 2, 3, 4, 5]

# Or with a list comprehension for one level deep:
flat = [x for sub in nested for x in sub]""")

add("What is memoization and how do I implement it in Python?",
"""Memoization caches function results so repeated calls with the same args are instant.

# Built-in — cleanest approach
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n-1) + fib(n-2)

# Manual dict cache
cache = {}
def fib(n):
    if n in cache:
        return cache[n]
    if n < 2:
        return n
    cache[n] = fib(n-1) + fib(n-2)
    return cache[n]""")

add("Write a Python context manager for timing code blocks.",
"""import time
from contextlib import contextmanager

@contextmanager
def timer(label=""):
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{label}: {elapsed:.4f}s")

# Usage:
with timer("matrix multiply"):
    result = some_heavy_operation()""")

add("How do I generate a UUID in JavaScript?",
"""// Modern browsers and Node 19+:
const id = crypto.randomUUID();

// Older environments:
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}""")

add("What is the difference between a process and a thread?",
    "A process is an independent program with its own memory space. A thread is a unit of execution within a process — threads share the process's memory. Threads are lighter (cheaper to spawn, faster to communicate) but share memory means race conditions are possible. Processes are isolated — a crash in one doesn't kill others.")

add("Explain what a REST API is.",
    "REST is an architectural style for APIs using HTTP. Resources are identified by URLs (e.g. /users/42). Operations use HTTP verbs: GET to read, POST to create, PUT/PATCH to update, DELETE to remove. Responses are stateless — each request carries all needed info. JSON is the standard format. REST is simple, scalable, and universally supported.")

# ── SYSTEM LEVEL ──────────────────────────────────────────────────────────────
add("What does chmod 755 mean in Linux?",
    "chmod 755 sets permissions: owner can read/write/execute (7 = 4+2+1), group can read/execute (5 = 4+1), others can read/execute (5). Typical for executables and web server directories — owner can modify, everyone else can only read/run.")

add("How do I find and kill a process using port 3000 on Windows?",
"""netstat -ano | findstr :3000
# Note the PID in the last column, then:
taskkill /PID <PID> /F""")

add("What is Docker and why use it?",
    "Docker packages your app and all its dependencies into a container — a lightweight isolated environment. It runs identically on any machine. Solves 'works on my machine' problems. Faster than VMs because containers share the host OS kernel. Essential for consistent dev/prod environments and microservices.")

# ─────────────────────────────────────────────────────────────────────────────
# Shuffle and write
random.shuffle(rows)
out_path = "loma_lora_dataset.jsonl"
with open(out_path, "w", encoding="utf-8") as f:
    for row in rows:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

print(f"Done. Wrote {len(rows)} rows to {out_path}")
print("Sample row:")
print(json.dumps(rows[0], indent=2)[:300])