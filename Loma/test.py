import sys
print("Python:", sys.version)

try:
    import torch
    print("torch ok:", torch.__version__)
except Exception as e:
    print("torch FAILED:", e)

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    print("transformers ok")
except Exception as e:
    print("transformers FAILED:", e)

try:
    from peft import LoraConfig, get_peft_model, TaskType
    print("peft ok")
except Exception as e:
    print("peft FAILED:", e)

try:
    from datasets import load_dataset
    print("datasets ok")
except Exception as e:
    print("datasets FAILED:", e)

try:
    dataset = load_dataset("json", data_files="loma_lora_dataset.jsonl", split="train")
    print("dataset ok, rows:", len(dataset))
except Exception as e:
    print("dataset FAILED:", e)