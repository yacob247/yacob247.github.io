    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const errorBar = document.getElementById('error-bar');
    const copyBtn = document.getElementById('copy-btn');
    const previewBgToggle = document.getElementById('preview-bg-toggle');

    let isDarkPreview = false;

    // Default Code Boilerplate
    const defaultCode = `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center transition-all hover:shadow-2xl">
        <h1 className="text-3xl font-extrabold mb-4 tracking-tight text-slate-800">
          React Live Canvas
        </h1>
        
        <p className="mb-8 text-slate-500">
          Paste your JSX directly into the editor. You can import ANY library from NPM!
          <br/><br/>
          <code className="bg-slate-100 px-2 py-1 rounded text-pink-500 text-sm">import confetti from 'canvas-confetti'</code>
        </p>
        
        <button
          onClick={() => setCount(c => c + 1)}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Clicked {count} times</span>
        </button>
      </div>
    </div>
  );
}`;

    // Initialize Default State
    editor.value = defaultCode;

    // Handle Tab key inside code area
    editor.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
      }
    });

    // Register a custom Babel plugin to rewrite NPM imports to esm.sh on the fly!
    // This allows you to import ANY library from NPM without hardcoding it.
    Babel.registerPlugin('dynamic-imports', function() {
      return {
        visitor: {
          ImportDeclaration(path) {
            const source = path.node.source.value;
            // If it's a standard npm package (not relative, absolute, or already a URL)
            if (!source.startsWith('.') && !source.startsWith('/') && !source.startsWith('http')) {
              // Ignore core react mappings, rewrite everything else to the CDN
              if (source !== 'react' && source !== 'react-dom/client' && !source.startsWith('react/jsx-')) {
                path.node.source.value = `https://esm.sh/${source}?external=react,react-dom`;
              }
            }
          }
        }
      };
    });

    // Compilation & Sandbox update pipeline
    function updatePreview() {
      const code = editor.value;
      let transpiledCode;

      try {
        // Enforce the Automatic JSX Runtime so "react/jsx-runtime" is requested on compiling JSX
        transpiledCode = Babel.transform(code, { 
          presets: [['react', { runtime: 'automatic' }]],
          plugins: ['dynamic-imports']
        }).code;
        errorBar.classList.add('hidden');
      } catch (err) {
        showError("Syntax Error:\n" + err.message);
        return;
      }

      // Encode the dynamic script string
      const dataUri = "data:text/javascript;charset=utf-8," + encodeURIComponent(transpiledCode);

      // Secure isolated mounting template
      const iframeHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
          <!-- Tailwind CSS -->
          <script src="https://cdn.tailwindcss.com"><\/script>
          
          <script>
            window.process = { env: { NODE_ENV: 'development' } };
            
            // Forward errors directly to the parent DOM debugger window
            window.onerror = function(msg) {
              window.parent.postMessage({ type: 'error', message: msg }, '*');
              return true; 
            };
            window.addEventListener('unhandledrejection', function(e) {
              window.parent.postMessage({ type: 'error', message: e.reason ? e.reason.message : 'Promise Rejection' }, '*');
            });
          <\/script>

          <!-- FIXED IMPORT MAP: Only map core React, the Babel plugin handles the rest! -->
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
                "react/jsx-dev-runtime": "https://esm.sh/react@18.2.0/jsx-runtime"
              }
            }
          <\/script>
        </head>
        <body class="${isDarkPreview ? 'bg-gray-950 text-white' : 'bg-white text-slate-900'}">
          <div id="root"></div>
          
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            
            async function mount() {
              try {
                // Dynamically import compiled React bundle from the URI
                const UserModule = await import("${dataUri}");
                const App = UserModule.default || UserModule.App;
                
                if (App) {
                   const root = createRoot(document.getElementById('root'));
                   root.render(React.createElement(App));
                } else {
                   window.parent.postMessage({ 
                     type: 'error', 
                     message: "Could not find a component to render. Make sure you use:\\n\\nexport default function App() { ... }" 
                   }, '*');
                }
              } catch(e) {
                window.parent.postMessage({ type: 'error', message: "Module Load Error:\\n" + e.message }, '*');
              }
            }

            mount();
          <\/script>
        </body>
        </html>
      `;

      preview.srcdoc = iframeHTML;
    }

    function showError(msg) {
      errorBar.textContent = msg;
      errorBar.classList.remove('hidden');
    }

    // Capture errors bubbling up from inside the frame
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'error') {
         showError("Runtime Error:\n" + e.data.message);
      }
    });

    // Auto-compilation debouncing
    let timeout;
    editor.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(updatePreview, 350);
    });

    // Copy code helper
    copyBtn.addEventListener('click', () => {
      // Direct backup copy logic
      const textarea = document.createElement('textarea');
      textarea.value = editor.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      const originalText = copyBtn.innerText;
      copyBtn.innerText = "Copied! ✓";
      copyBtn.classList.add('bg-green-700', 'border-green-600');
      setTimeout(() => {
        copyBtn.innerText = originalText;
        copyBtn.classList.remove('bg-green-700', 'border-green-600');
      }, 1500);
    });

    // Preview Background Theme Toggle
    previewBgToggle.addEventListener('click', () => {
      isDarkPreview = !isDarkPreview;
      updatePreview();
    });

    // Run first compile instantly
    updatePreview();
