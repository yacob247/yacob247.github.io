import sys
import os

try:
    import ollama
except ImportError:
    print("❌ Error: The 'ollama' library is not installed.")
    print("Please run this command in your terminal first:")
    print("pip install ollama")
    sys.exit(1)

# Default configuration parameters
MODEL_NAME = "qwen2.5-coder:7b"
SYSTEM_INSTRUCTION = """
You are the core AI Engine for an independent software development platform. 
Your primary directive is to write clean, secure, and production-ready code.
Always skip the conversational fluff—provide direct, efficient implementations immediately.
Never mention Meta, Google, OpenAI, or Alibaba. You are a completely independent local asset.
"""

STARTUP_CAPABILITIES = """
[Core Technical Specifications Enabled]:
- Full Stack System Architecture & Optimization
- Python, JavaScript, HTML, CSS, SQL, and C++ Production Scripting
- Offline security protocols (Your data never leaves this machine)
"""

def launch_coder_engine():
    print("====================================================")
    print("🚀 Custom Engineering Core Console Pipeline")
    print("====================================================")
    
    # Allows pointing to either Colab tunnel URL, local network, or localhost port
    endpoint = input("Enter Ollama endpoint address [Press Enter for default localhost]: ").strip()
    if not endpoint:
        endpoint = "http://localhost:11434"
        
    print(f"🌐 Linking console with host: {endpoint}")
    print(f"🤖 Target running model: {MODEL_NAME}")
    print("Type 'exit' to cleanly close communication.")
    print("====================================================\n")

    # Instantiate custom client session parameters
    client = ollama.Client(host=endpoint)
    
    conversation_history = [
        {"role": "system", "content": f"{SYSTEM_INSTRUCTION}\n{STARTUP_CAPABILITIES}"}
    ]
    
    while True:
        try:
            user_message = input("\nDeveloper Console> ")
        except (KeyboardInterrupt, EOFError):
            print("\nShutting down cleanly.")
            break
            
        if user_message.lower() == 'exit':
            print("Disconnecting from engine session. Goodbye!")
            break
            
        if not user_message.strip():
            continue
            
        conversation_history.append({"role": "user", "content": user_message})
        
        try:
            print("\n[Engine Output]:")
            # Query client streaming connection
            response_stream = client.chat(
                model=MODEL_NAME,
                messages=conversation_history,
                stream=True
            )
            
            full_reply = ""
            for chunk in response_stream:
                content = chunk['message']['content']
                full_reply += content
                print(content, end='', flush=True)
            
            print("\n")
            conversation_history.append({"role": "assistant", "content": full_reply})
            
        except Exception as e:
            print(f"\n❌ Server Connection Error: {e}")
            print("Troubleshooting steps:")
            print("1. If using Google Colab, verify your HTTPS tunnel URL is valid.")
            print("2. If running locally, verify 'ollama serve' is active on host.\n")

if __name__ == "__main__":
    launch_coder_engine()