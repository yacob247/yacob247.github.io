import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
import time
import csv
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
SITEMAP_URL = "https://envizion.work/sitemap.xml"
SCAN_LIMIT = 282      # Set to a lower number (e.g., 15) for testing, or higher for full scan
CRAWL_DELAY = 0.5    # Seconds to wait between requests (prevents getting blocked)

def get_urls_from_sitemap(sitemap_url):
    """Fetches and parses the sitemap.xml to extract all URLs."""
    print(f"[*] Fetching sitemap from: {sitemap_url}...")
    try:
        response = requests.get(sitemap_url, headers={'User-Agent': 'AdSense-Compliance-Bot/1.0'})
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        
        # Sitemaps typically use this namespace
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        # Extract all <loc> tags
        urls = []
        for url in root.findall('.//ns:url/ns:loc', namespace):
            if url.text:
                urls.append(url.text.strip())
                
        # Fallback if namespace is missing or different
        if not urls:
            for url in root.findall('.//loc'):
                if url.text:
                    urls.append(url.text.strip())
                    
        return urls
    except Exception as e:
        print(f"[!] Error parsing sitemap: {e}")
        return []

def analyze_page_compliance(url):
    """Downloads a URL, strips boilerplate code, and analyzes the text content."""
    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': 'AdSense-Compliance-Bot/1.0'})
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove structural and non-content elements to isolate readable editorial text
        for element in soup(["script", "style", "noscript", "svg", "code", "nav", "footer", "header", "iframe"]):
            element.decompose()
            
        raw_text = soup.get_text(separator=' ')
        
        # Split into words, ignoring single characters like punctuation
        words = [w for w in raw_text.split() if len(w) > 1]
        word_count = len(words)
        
        # Estimate text-to-code ratio
        total_chars = len(response.text)
        text_chars = len(raw_text)
        text_ratio = (text_chars / total_chars) * 100 if total_chars > 0 else 0
        
        # Check for core AdSense compliance elements (Privacy, Terms, etc.)
        url_lower = url.lower()
        has_privacy = any(x in url_lower for x in ['privacy', 'terms', 'about', 'contact'])
        
        # Determine readiness rating
        status_type = ""
        if word_count < 150:
            status = "Low-Value Content Risk (Thin UI)"
            status_type = "Risk"
        elif text_ratio < 10:
            status = "High Code-to-Text Discrepancy"
            status_type = "Warning"
        else:
            status = "Optimal Content Density"
            status_type = "Optimal"
            
        return {
            "url": url,
            "words": word_count,
            "ratio": text_ratio,
            "status": status,
            "status_type": status_type,
            "is_legal": has_privacy
        }
    except Exception as e:
        return {
            "url": url, 
            "words": 0, 
            "ratio": 0, 
            "status": f"Failed: {str(e)[:30]}...", 
            "status_type": "Error",
            "is_legal": False
        }

def export_to_csv(results, filename):
    """Exports the scan results to a CSV file."""
    keys = ['url', 'words', 'ratio', 'is_legal', 'status']
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for r in results:
                writer.writerow({
                    'url': r['url'],
                    'words': r['words'],
                    'ratio': round(r['ratio'], 2),
                    'is_legal': 'Yes' if r['is_legal'] else 'No',
                    'status': r['status']
                })
        print(f"[*] Results successfully exported to {filename}")
    except Exception as e:
        print(f"[!] Failed to write CSV: {e}")

def main():
    print("=" * 110)
    print(f"{'ADSENSE COMPLIANCE TRACKER':^110}")
    print("=" * 110)
    
    all_urls = get_urls_from_sitemap(SITEMAP_URL)
    
    if not all_urls:
        print("[!] No URLs found. Exiting.")
        return

    print(f"[*] Found {len(all_urls)} pages in sitemap.")
    
    urls_to_scan = all_urls[:SCAN_LIMIT]
    print(f"[*] Scanning {len(urls_to_scan)} pages (Delay: {CRAWL_DELAY}s)...\n")

    # Table Header
    print(f"{'URL Target':<50} | {'Words':<6} | {'Text %':<8} | {'Legal':<5} | {'AdSense Bot Status'}")
    print("-" * 110)
    
    results = []
    stats = {'optimal': 0, 'risk': 0, 'warning': 0, 'words_total': 0, 'errors': 0}

    # Crawl Loop
    try:
        for idx, url in enumerate(urls_to_scan, 1):
            report = analyze_page_compliance(url)
            results.append(report)
            
            # Formatting for table
            truncated_url = report['url'][:47] + "..." if len(report['url']) > 50 else report['url']
            legal_str = "Yes" if report['is_legal'] else "-"
            
            print(f"{truncated_url:<50} | {report['words']:<6,} | {report['ratio']:<7.2f}% | {legal_str:<5} | {report['status']}")
            
            # Update Stats
            if report['status_type'] == 'Optimal': stats['optimal'] += 1
            elif report['status_type'] == 'Risk': stats['risk'] += 1
            elif report['status_type'] == 'Warning': stats['warning'] += 1
            elif report['status_type'] == 'Error': stats['errors'] += 1
            
            stats['words_total'] += report['words']
            
            # Throttling
            if idx < len(urls_to_scan):
                time.sleep(CRAWL_DELAY)
                
    except KeyboardInterrupt:
        print("\n[!] Scan interrupted by user.")
    
    # Print Dashboard Summary
    print("\n" + "=" * 110)
    print(f"{'SCAN SUMMARY':^110}")
    print("=" * 110)
    total_scanned = len(results)
    avg_words = int(stats['words_total'] / total_scanned) if total_scanned > 0 else 0
    
    print(f"  Total Pages Scanned : {total_scanned}")
    print(f"  Average Word Count  : {avg_words}")
    print(f"  Optimal Pages       : {stats['optimal']}")
    print(f"  Thin Content Risks  : {stats['risk']}")
    print(f"  Code-Heavy Warnings : {stats['warning']}")
    print(f"  Failed/Errors       : {stats['errors']}")
    print("-" * 110)

    # Export to CSV
    date_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
    csv_filename = f"adsense_audit_{date_str}.csv"
    export_to_csv(results, csv_filename)

if __name__ == "__main__":
    main()