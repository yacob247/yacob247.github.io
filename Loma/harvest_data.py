import json
import urllib.parse
import requests
from bs4 import BeautifulSoup

def harvest_html_from_web(query_term):
    print(f"Server looking up: {query_term}")
    proxy_gateway = "https://allorigins.win"
    target_search = f"https://duckduckgo.com{urllib.parse.quote(query_term)}+example+code"
    
    harvested_samples = []
    try:
        res = requests.get(f"{proxy_gateway}{urllib.parse.quote(target_search)}")
        soup = BeautifulSoup(res.json()['contents'], 'html.parser')
        links = [a['href'] for a in soup.find_all('a', class_='result__url') if 'href' in a.attrs][:3]
        
        for url in links:
            try:
                page_res = requests.get(f"{proxy_gateway}{urllib.parse.quote(url)}", timeout=5)
                page_soup = BeautifulSoup(page_res.json()['contents'], 'html.parser')
                
                # Scrupulously target raw code block structures
                for block in page_soup.find_all(['code', 'pre']):
                    code_text = block.get_text().strip()
                    if len(code_text) > 40 and ("<html" in code_text or "<div" in code_text or "style=" in code_text):
                        harvested_samples.append(code_text)
                        break 
            except Exception:
                continue
    except Exception as e:
        print(f"Scraper error: {e}")
        
    return harvested_samples

# What concepts do you want Loma Ai to search up and master?
topics = ["modern navbar css flexbox", "responsive card grid html css", "pulsing button animation template"]
new_data = []

for topic in topics:
    found_blocks = harvest_html_from_web(topic)
    for code_sample in found_blocks:
        new_data.append({
            "instruction": f"Develop structured HTML/CSS code configuration for: {topic}.",
            "chosen": f"Here is the optimized setup:\n\n```html\n{code_sample}\n```",
            "rejected": "" # Keeps formatting compatible with your existing RLHF architecture pipelines
        })

# Append newly harvested training data directly into your existing project file
try:
    with open("my_rlhf_dataset.json", "r") as f:
        existing_data = json.load(f)
except Exception:
    existing_data = []

existing_data.extend(new_data)

with open("my_rlhf_dataset.json", "w") as f:
    json.dump(existing_data, f, indent=4)

print(f"Harvest complete! Added {len(new_data)} items directly into your 'my_rlhf_dataset.json' file.")
