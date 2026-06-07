import torch

print("=========================================")
print("🚀 TESTING YOUR GPU TRAINING ENVIRONMENT")
print("=========================================\n")

# Check if CUDA (GPU support) is available
cuda_available = torch.cuda.is_available()
print(f"🔹 CUDA Layer Detected: {cuda_available}")

if cuda_available:
    device_id = torch.cuda.current_device()
    device_name = torch.cuda.get_device_name(device_id)
    
    # Calculate available VRAM in Gigabytes
    total_memory_bytes = torch.cuda.get_device_properties(device_id).total_memory
    total_memory_gb = total_memory_bytes / (1024 ** 3)
    
    print(f"✅ GPU Device Name:   {device_name}")
    print(f"🔹 CUDA Version:       {torch.version.cuda}")
    print(f"🔹 Current Device ID:  {device_id}")
    print(f"📊 Total Active VRAM:  {total_memory_gb:.2f} GB")
    
    if total_memory_gb < 8:
        print("\n⚠️ WARNING: You have less than 8GB of VRAM.")
        print("Training RLHF/LoRA on a 7B model may cause Out Of Memory (OOM) errors.")
        print("Ensure 'device_map=\"cpu\"' is used when merging weights!")
else:
    print("❌ CRITICAL: PyTorch is running on the CPU only.")
    print("Your NVIDIA drivers or CUDA toolkit are missing/misconfigured.")

print("\n=========================================")