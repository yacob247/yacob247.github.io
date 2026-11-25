import xml.etree.ElementTree as ET

# 1. Your exact sitemap string content
sitemap_data = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Root Company Pages -->
  <url><loc>https://envizion.work/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://envizion.work/index.html</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://envizion.work/about.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://envizion.work/contact.html</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://envizion.work/privacy.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://envizion.work/terms.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://envizion.work/editorial-policy.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://envizion.work/disclaimer.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://envizion.work/website-envizion.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://envizion.work/main.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>

  <!-- Tools Hub -->
  <url><loc>https://envizion.work/tools/index.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://envizion.work/tools/tools-guide.html</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://envizion.work/tools/background-remover-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/image-optimizer-pro.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/mp4tomp3-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/universal-file-encryption.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/life-tools-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/instant-dictionary-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/pdf-to-text-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/omniconvert-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/mediaforge-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/mediaplayer-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/teleprompter-home.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://envizion.work/tools/advanced-video-watermarker.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>

  <!-- Reviews & Blog -->
  <url><loc>https://envizion.work/reviews-blog/index.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://envizion.work/reviews-blog/blog.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>"""

# 2. Setup standard sitemap schema namespacing
ET.register_namespace('', "http://www.sitemaps.org/schemas/sitemap/0.9")
root = ET.fromstring(sitemap_data)
namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

# 3. Specify target elements to extract from the structural block
excludes = {
    "https://envizion.work/disclaimer.html", 
    "https://envizion.work/website-envizion.html"
}

# 4. Parse nodes and drop thin matches safely
removed = 0
for url_node in list(root.findall('ns:url', namespaces)):
    loc_node = url_node.find('ns:loc', namespaces)
    if loc_node is not None and loc_node.text.strip() in excludes:
        root.remove(url_node)
        removed += 1

# 5. Overwrite/save the finalized sitemap structure to file
with open("sitemap.xml", "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    f.write(ET.tostring(root, encoding='utf-8').decode('utf-8'))

print(f"Success: Dropped {removed} target elements. Clean file saved as 'sitemap.xml'.")
