#!/usr/bin/env python3
"""
Bulk SEO fixer: injects missing meta description, canonical, OG tags, robots, 
and AdSense publisher ID into all HTML files across the project.
"""

import os, re

PUB_ID = 'ca-pub-5812524294035974'
DOMAIN = 'https://envizion.work'

# Map relative paths to SEO descriptions
PAGE_DESCRIPTIONS = {
    # Tools - working tool pages (the ones that need it most)
    'tools/mp4tomp3.html': 'Convert MP4 video files to MP3 audio directly in your browser. Free, fast, local MP4 to MP3 converter with no file upload required.',
    'tools/mp4tomp3-home.html': 'Learn how to extract audio from video files using Envizion free browser-based MP4 to MP3 converter tool.',
    'tools/background-remover.html': 'Remove image backgrounds automatically in your browser. Free AI-powered background removal tool that processes 100% locally.',
    'tools/background-remover-home.html': 'Guide to Envizions free browser-based background removal tool. Remove backgrounds from images without uploading to any server.',
    'tools/image-optimizer-pro.html': 'Optimize, compress, and resize images in bulk using this free browser-based image optimizer. No server upload required.',
    'tools/imagesupscaler.html': 'Upscale and enlarge images using browser-based AI upscaling. Free tool that increases image resolution up to 4x locally.',
    'tools/Image-Text-Extractor.html': 'Extract text from images using OCR technology directly in your browser. Free local image to text converter.',
    'tools/InstantDictionary.html': 'Free instant dictionary and thesaurus. Look up word definitions, synonyms, and usage examples instantly in your browser.',
    'tools/instant-dictionary-home.html': 'Guide to the Envizion Instant Dictionary tool. Look up word definitions and expand your vocabulary with this free browser tool.',
    'tools/advanced-video-watermarker.html': 'Add watermarks to videos in your browser. Free video watermarking tool with customizable text and image overlay options.',
    'tools/local_video_image_mask_merger.html': 'Merge videos and images with masking in your browser. Free compositing tool for creative media projects.',
    'tools/mediaplayer.html': 'Free browser-based media player supporting video and audio playback. Play local media files without any software installation.',
    'tools/mediaplayer-home.html': 'Guide to the Envizion Media Player. Learn how to play audio and video files directly in your browser for free.',
    'tools/mediaforge.html': 'Advanced browser-based media processing tool. Trim, merge, convert, and edit media files entirely in your browser.',
    'tools/mediaforge-home.html': 'Guide to Envizion MediaForge Pro. Learn about browser-based media processing including trimming and conversion.',
    'tools/media-library.html': 'Organize and manage your media files in a browser-based library. Free tool for sorting and previewing audio and video files.',
    'tools/life-tools.html': 'Free collection of everyday calculators, planners, and productivity tools. All running locally in your browser, no account needed.',
    'tools/life-tools-home.html': 'Guide to the Envizion Life Tools collection. Discover calculators and planners for personal and professional use.',
    'tools/omniconvert-home.html': 'Guide to Envizion OmniConvert Pro - the all-in-one converter for images, documents, PDFs, and more.',
    'tools/envizionomniconvertpro.html': 'Free all-in-one file converter supporting images, audio, documents, and more. Convert files locally in your browser.',
    'tools/pdfmerger.html': 'Merge multiple PDF files into one document directly in your browser. Free PDF merger with no file size limits.',
    'tools/pdf-to-text-home.html': 'Guide to extracting text from PDF files using Envizions free browser-based PDF text extraction tool.',
    'tools/pdfstotxt.html': 'Convert PDF documents to editable text files directly in your browser. Free local PDF to text converter.',
    'tools/teleprompter.html': 'Free browser-based teleprompter tool for video recording and presentations. Adjustable scrolling speed and fullscreen mode.',
    'tools/teleprompter-home.html': 'Guide to the Envizion Teleprompter Studio. Learn how to use this free browser teleprompter for your recordings.',
    'tools/steganovault.html': 'Hide and retrieve secret messages inside images using steganography. Free browser-based data hiding tool.',
    'tools/universal-file-encryption.html': 'Encrypt and decrypt files in your browser using AES encryption. Free local file encryption tool with no server upload.',
    'tools/vocal-music-separator.html': 'Separate vocals from music tracks directly in your browser. Free AI-powered audio separation tool.',
    'tools/voice-recorder.html': 'Free browser-based voice recorder. Record, playback, and download audio directly from your microphone.',
    'tools/velolink.html': 'Free link shortening and management tool. Create short URLs and manage your links entirely in the browser.',
    'tools/u8.html': 'Collection of 8 essential micro-tools for everyday tasks. Free browser utilities for quick calculations and conversions.',
    'tools/the-new-project.html': 'Experimental workspace for testing and prototyping new ideas. Free browser-based sandbox environment.',
    'tools/tools-guide.html': 'Complete reference guide to all Envizion tools. Learn about each tool and how to use them effectively.',
    'tools/htmlviewer.html': 'View and preview HTML code in real-time. Free browser-based HTML viewer and editor with live preview.',
    'tools/R/index.html': 'Reference and utility tools collection from Envizion.',
    
    # Tools2 pages
    'tools2/envizion_editor.html': 'Free browser-based code editor with syntax highlighting and live preview. Write and test code directly in your browser.',
    'tools2/envizion_playground.html': 'Experimental sandbox for testing tools, code snippets, and UI prototypes in your browser.',
    'tools2/image_resizer.html': 'Resize images to exact dimensions or scale percentages directly in your browser. Free tool with bulk processing.',
    'tools2/bulk_webp_converter.html': 'Convert multiple images to WebP format in bulk. Free browser-based image converter for web optimization.',
    'tools2/fbx_to_glb_converter.html': 'Convert FBX 3D model files to GLB format for web use. Free browser-based 3D model converter.',
    'tools2/local_glb_viewer.html': 'View and inspect GLB/GLTF 3D model files directly in your browser. Free 3D model viewer with drag and drop.',
    'tools2/pdf_merger.html': 'Advanced PDF merger with page reordering and preview. Combine PDF files directly in your browser.',
    'tools2/secure_converter.html': 'Convert sensitive files with zero network transmission. Free secure file converter that runs 100% locally.',
    'tools2/secure_pdf_compressor.html': 'Compress PDF files locally with no server upload. Free secure PDF compression tool.',
    'tools2/superfast_video_compressor.html': 'Compress large video files in your browser using WebAssembly. Free high-speed video compression.',
    'tools2/mp3_editor_mp4_converter.html': 'Edit MP3 audio and convert to MP4 with visual backgrounds. Free browser-based audio editor.',
    'tools2/local_vocal_remover.html': 'Remove vocals from music tracks entirely offline. Free browser-based vocal isolation tool.',
    'tools2/local_video_image_mask_merger.html': 'Advanced video and image compositing with masking layers. Free creative media tool.',
    'tools2/animator_studio.html': 'Create animations and motion graphics in your browser. Free browser-based animation studio.',
    'tools2/visual_level_builder.html': 'Build and export 2D game levels visually. Free drag-and-drop level editor for game developers.',
    'tools2/about.html': 'Learn about Envizion - the free browser-based tool collection for creators, students, and professionals.',
    'tools2/contact.html': 'Contact the Envizion team for support, feature requests, and business inquiries.',
    'tools2/luma_dashboard_clone.html': 'Dashboard interface clone for monitoring and analytics visualization.',
    'tools2/main...3d_model_viewer.html': '3D model viewer for inspecting and previewing 3D assets in the browser.',
    'tools2/privacy.html': 'Privacy policy for the Envizion tools and browser-based application platform.',
    
    # Reviews blog pages
    'reviews-blog/blog.html': 'Envizion blog featuring articles, tutorials, updates, and deep-dives on tools, tech, and development.',
    'reviews-blog/blog-post.html': 'In-depth blog post covering tools, tutorials, game reviews, and technology topics from Envizion.',
    'reviews-blog/game.html': 'In-depth game reviews with honest grades. Discover indie titles and classic games reviewed by the Envizion team.',
    'reviews-blog/gamevaultoriginal.html': 'GameVault - comprehensive game review index with search, filters, and detailed analysis.',
    'reviews-blog/indexcopy.html': 'Envizion reviews and blog index featuring game reviews, tools, and editorial content.',
    'reviews-blog/404.html': 'Page not found - the requested page could not be found on Envizion.',
    'reviews-blog/unsubscribe.html': 'Unsubscribe from Envizion newsletter and email notifications.',
    'reviews-blog/login.html': 'Login to your Envizion account to manage reviews and blog content.',
    'reviews-blog/signup.html': 'Sign up for an Envizion account to contribute reviews and access community features.',
    'reviews-blog/3029-43987395439453enviz474666-(8-ion34525indexa34532dmin.html': 'Admin interface for Envizion reviews and blog management.',
    'reviews-blog/BlOg-PoSts---admin.html': 'Admin blog post management interface for Envizion content management.',
    
    # WorldCups
    'WorldCups/index.html': 'World Cup history and statistics - explore past tournaments, teams, and match results.',
    'WorldCups/archive2022.html': '2022 FIFA World Cup archive - complete results, stats, and highlights from the tournament.',
    'WorldCups/team.html': 'World Cup team profiles and statistics - explore national team histories and performances.',
    'WorldCups/trivia.html': 'World Cup trivia and fun facts - test your knowledge of football history and tournaments.',
    'Worldcup.html': 'World Cup coverage and resources from Envizion.',
    'woodbury_getaway (3).html': 'Woodbury Getaway - travel and destination information guide.',
    
    # Wiki
    'Wiki/index.html': 'Envizion Wiki - knowledge base and reference resource for tools and topics.',
    'Wiki/1/index.html': 'Wiki section index - browse knowledge base articles and reference materials.',
    'Wiki/1/1.html': 'Wiki article on browser-based tools and their capabilities for everyday tasks.',
    'Wiki/1/2.html': 'Wiki article exploring file formats, compatibility, and best practices for digital media.',
    'Wiki/1/3.html': 'Wiki guide to understanding WebAssembly, browser APIs, and modern web technologies.',
    
    # Other root pages
    'website-envizion.html': 'Envizion company product page - the first launched Yacob Digital website with free browser tools.',
    'CodeWeb.html': 'CodeWeb - macOS-style developer terminal reference with 100+ searchable guides.',
    'codewebabout.html': 'About CodeWeb - learn about this developer terminal reference tool.',
    'main.html': 'Envizion Hub - main portal to free browser-based tools, reviews, and resources.',
}

PAGE_TITLES = {
    'WorldCups/team.html': 'World Cup Teams | National Team Profiles & Statistics',
    'website-envizion.html': 'Envizion Website | Free Browser-Based Tools by Yacob Digital',
    'main.html': 'Envizion Hub | Free Browser Tools, Reviews & Resources',
    'CodeWeb.html': 'CodeWeb | Developer Terminal Reference & macOS CLI Guide',
    'codewebabout.html': 'About CodeWeb | Developer Tool Reference Guide',
    'Worldcup.html': 'World Cup Coverage | Football Tournament Resources',
    'woodbury_getaway (3).html': 'Woodbury Getaway | Travel & Destination Guide',
}

def fix_file(filepath):
    rel_path = os.path.relpath(filepath, '.').replace('\\', '/')
    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read()
    original = content
    changes = []
    
    # Fix missing title
    if not re.search(r'<title>', content, re.I):
        title_text = PAGE_TITLES.get(rel_path, 'Envizion | Free Browser-Based Tools & Resources')
        title_tag = f'<title>{title_text}</title>'
        # Insert after charset
        if '<meta charset' in content:
            content = re.sub(r'(<meta[^>]*charset[^>]*>)', r'\1\n  ' + title_tag, content, count=1, flags=re.I)
        elif '<meta charset' in content:
            content = re.sub(r'(<meta[^>]*charset[^>]*>)', r'\1\n  ' + title_tag, content, count=1, flags=re.I)
        changes.append('title')
    
    # Fix missing description
    if not re.search(r'<meta[^>]*name=["\']description["\']', content, re.I):
        desc = PAGE_DESCRIPTIONS.get(rel_path, '')
        if desc:
            desc_tag = f'<meta name="description" content="{desc}"/>'
            # Insert after title or at start of head
            if '<title>' in content:
                content = re.sub(r'(</title>)', r'\1\n  ' + desc_tag, content, count=1, flags=re.I)
            changes.append('description')
    
    # Fix missing canonical
    if not re.search(r'rel=["\']canonical["\']', content, re.I):
        if '<link ' in content:
            canonical_url = f'{DOMAIN}/{rel_path}'
            canonical_tag = f'<link href="{canonical_url}" rel="canonical"/>'
            content = re.sub(r'(</head>)', r'  ' + canonical_tag + r'\n' + r'\1', content, count=1, flags=re.I)
            changes.append('canonical')
    
    # Fix missing robots
    if not re.search(r'name=["\']robots["\']', content, re.I):
        # Skip admin/login pages
        if 'admin' not in rel_path and 'login' not in rel_path and 'signup' not in rel_path:
            robots_tag = '<meta content="index, follow, max-image-preview:large" name="robots"/>'
            content = re.sub(r'(<meta[^>]*charset[^>]*>)', r'\1\n  ' + robots_tag, content, count=1, flags=re.I)
            changes.append('robots')
    
    # Fix missing OG tags  
    if not re.search(r'property=["\']og:', content, re.I):
        og_blocks = []
        title_match = re.search(r'<title>(.*?)</title>', content, re.I)
        og_title = title_match.group(1) if title_match else 'Envizion'
        desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', content, re.I)
        og_desc = desc_match.group(1) if desc_match else 'Free browser-based tools and resources'
        
        og_blocks.append(f'<meta content="{og_title}" property="og:title"/>')
        og_blocks.append(f'<meta content="{og_desc}" property="og:description"/>')
        og_blocks.append(f'<meta content="website" property="og:type"/>')
        og_blocks.append(f'<meta content="{DOMAIN}/logo.png" property="og:image"/>')
        
        content = re.sub(r'(</head>)', r'  ' + '\n  '.join(og_blocks) + r'\n' + r'\1', content, count=1, flags=re.I)
        changes.append('og_tags')
    
    # Fix missing AdSense publisher ID on pages that should have it
    if PUB_ID not in content and 'admin' not in rel_path and 'login' not in rel_path and 'signup' not in rel_path:
        # Check if it's a reasonable page to add AdSense to
        if not rel_path.startswith('Loma') and not rel_path.startswith('R\\') and not rel_path.startswith('R/'):
            adsense_tag = f'<meta content="{PUB_ID}" name="google-adsense-account"/>'
            adsense_script = f'<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUB_ID}"></script>'
            content = re.sub(r'(</head>)', r'  ' + adsense_tag + r'\n  ' + adsense_script + r'\n' + r'\1', content, count=1, flags=re.I)
            changes.append('adsense')
    
    if content != original:
        open(filepath, 'w', encoding='utf-8').write(content)
        return changes
    return None

# Fix all HTML files
fixed = 0
total_changes = {}
for root, dirs, files in os.walk('.'):
    # Skip Loma, node_modules, .git
    if '\\Loma\\' in root or '/Loma/' in root or '\\node_modules' in root or '/node_modules' in root or '\\.git' in root:
        continue
    for f in files:
        if f.endswith('.html'):
            fp = os.path.join(root, f)
            result = fix_file(fp)
            if result:
                rel = os.path.relpath(fp, '.').replace('\\', '/')
                total_changes[rel] = result
                fixed += 1

print(f"Fixed {fixed} files")
for path, changes in sorted(total_changes.items()):
    print(f"  {path}: {', '.join(changes)}")
print()
print("Done!")