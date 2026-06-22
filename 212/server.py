from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import os

app = Flask(__name__)
CORS(app) # Enables Cross-Origin Resource Sharing so your HTML file can talk to this server

@app.route('/download', methods=['POST'])
def download_video():
    data = request.json
    url = data.get('url')
    format_choice = data.get('format', 'mp3')

    if not url:
        return jsonify({'status': 'error', 'message': 'URL is required'}), 400

    try:
        # yt-dlp configuration options
        ydl_opts = {
            'outtmpl': '%(title)s.%(ext)s', # Saves file in the same directory with its YouTube title
            'quiet': False
        }

        # Apply specific settings based on the user's choice
        if format_choice == 'mp3':
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            })
        else:
            ydl_opts.update({
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            })

        # Execute the download
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            title = info_dict.get('title', 'video')

        return jsonify({'status': 'success', 'message': f'Successfully downloaded: {title}'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("Starting local server on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)