import sys

# Safety check: ensures the user has installed the Ollama Python library
try:
    import ollama
except ImportError:
    print("❌ Error: The 'ollama' library is not installed.")
    print("Please run this command in your terminal first:")
    print("pip install ollama")
    sys.exit(1)

# ------------------------------------------------------------------
# CONFIGURATION: Pointing to your local Qwen Coder engine
# ------------------------------------------------------------------
MODEL_NAME = "qwen2.5-coder:7b"

# 1. SYSTEM PROMPT: Forces it to act as your proprietary startup asset
SYSTEM_INSTRUCTION = """
You are the core AI Engine for an independent software development platform. 
Your primary directive is to write clean, secure, and production-ready code.
Always skip the conversational fluff—provide direct, efficient implementations immediately.
Never mention Meta, Google, OpenAI, or Alibaba. You are a completely independent local asset.
"""

# 2. CAPABILITIES: Hardcoded rules the AI always keeps in its context rope
STARTUP_CAPABILITIES = """
[Core Technical Specifications Enabled]:
- Full Stack System Architecture & Optimization
- Python, JavaScript, HTML, CSS, SQL, and C++ Production Scripting
- Offline security protocols (Your data never leaves this machine)
"""

def launch_coder_engine():
    print("====================================================")
    print(f"🚀 Custom Engineering Core Initialized [{MODEL_NAME}]")
    print("System is offline, private, and secure.")
    print("Type 'exit' to shut down the console connection.")
    print("====================================================\n")
    
    # Establish the system-level memory
    conversation_history = [
        {"role": "system", "content": f"{SYSTEM_INSTRUCTION}\n{STARTUP_CAPABILITIES}"}
    ]
    
    while True:
        try:
            # Command Prompt style input
            user_message = input("\nDeveloper Console> ")
        except (KeyboardInterrupt, EOFError):
            print("\nShutting down cleanly.")
            break
            
        if user_message.lower() == 'exit':
            print("Disconnecting from local engine. Goodbye!")
            break
            
        if not user_message.strip():
            continue
            
        # Add user's request to the continuous conversation chain
        conversation_history.append({"role": "user", "content": user_message})
        
        try:
            print("\n[Engine Output]:")
            # Query your local Qwen engine running via Ollama WITH STREAMING enabled
            response_stream = ollama.chat(
                model=MODEL_NAME,
                messages=conversation_history,
                stream=True # Gives a realistic typing effect in the terminal
            )
            
            full_reply = ""
            for chunk in response_stream:
                content = chunk['message']['content']
                full_reply += content
                # Print each word as it generates
                print(content, end='', flush=True)
            
            print("\n")
            
            # Feed the fully compiled reply back into the history so it remembers previous lines
            conversation_history.append({"role": "assistant", "content": full_reply})
            
        except Exception as e:
            print(f"\n❌ Local Server Connection Error: {e}")
            print("Troubleshooting steps:")
            print("1. Make sure the Ollama application is running in your taskbar.")
            print("2. Verify the model exists by running: ollama list")
            print("3. Try running your terminal as Administrator.\n")

if __name__ == "__main__":
    launch_coder_engine()