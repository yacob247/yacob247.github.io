pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

var fileInput = document.getElementById("file-input");
var dropZone = document.getElementById("drop-zone");
var extractBtn = document.getElementById("extract-btn");
var clearBtn = document.getElementById("clear-btn");
var copyTextBtn = document.getElementById("copy-text-btn");
var copyJsonBtn = document.getElementById("copy-json-btn");
var downloadBtn = document.getElementById("download-btn");
var viewTextBtn = document.getElementById("view-text-btn");
var viewJsonBtn = document.getElementById("view-json-btn");
var fileMeta = document.getElementById("file-meta");
var output = document.getElementById("output");
var outputLabel = document.getElementById("output-label");
var logBox = document.getElementById("log");
var bar = document.getElementById("bar");
var selectedFiles = [];
var extractedRows = [];
var textOutput = "";
var jsonOutput = "";

function log(message, type){
  var line = document.createElement("div");
  line.className = type || "";
  line.textContent = "[" + new Date().toLocaleTimeString() + "] " + message;
  if(logBox.textContent === "Waiting for PDFs...") logBox.textContent = "";
  logBox.appendChild(line);
  logBox.scrollTop = logBox.scrollHeight;
}

function setProgress(done, total){
  bar.style.width = total ? Math.round((done / total) * 100) + "%" : "0";
}

function setFiles(files){
  selectedFiles = Array.prototype.slice.call(files).filter(function(file){
    return /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  });
  fileMeta.textContent = selectedFiles.length ? selectedFiles.length + " PDF file(s) ready." : "No PDF files selected.";
  extractBtn.disabled = selectedFiles.length === 0;
  log(selectedFiles.length ? "Ready: " + selectedFiles.length + " file(s)." : "No PDF files found.", selectedFiles.length ? "info" : "err");
}

function cleanText(value){
  return String(value || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function subjectGuess(name){
  var n = name.toLowerCase();
  if(n.indexOf("biology") >= 0) return "biology";
  if(n.indexOf("chemistry") >= 0 || n.indexOf("surfing chemistry") >= 0) return "chemistry";
  if(n.indexOf("physics") >= 0) return "physics";
  if(n.indexOf("business") >= 0 || n.indexOf("bs hsc") >= 0 || n.indexOf("bs-hsc") >= 0) return "business-studies";
  if(n.indexOf("economy") >= 0 || n.indexOf("economics") >= 0) return "economics";
  if(n.indexOf("legal") >= 0) return "legal-studies";
  if(n.indexOf("modern history") >= 0 || n.indexOf("key features") >= 0) return "modern-history";
  if(n.indexOf("pdhpe") >= 0) return "pdhpe";
  if(n.indexOf("quoideneuf") >= 0 || n.indexOf("french") >= 0) return "french";
  if(n.indexOf("engineering") >= 0 || n.indexOf("mechanics") >= 0) return "engineering-studies";
  if(n.indexOf("hospitality") >= 0) return "hospitality";
  if(n.indexOf("software") >= 0) return "software-design-development";
  if(n.indexOf("religion") >= 0) return "studies-of-religion";
  if(n.indexOf("standard mathematics") >= 0) return "mathematics-standard-2";
  if(n.indexOf("extension 2") >= 0 || n.indexOf("ext 2") >= 0) return "mathematics-extension-2";
  if(n.indexOf("extension 1") >= 0 || n.indexOf("fitzpatrick") >= 0 || n.indexOf("foundation") >= 0 || n.indexOf("development") >= 0) return "mathematics-extension-1";
  if(n.indexOf("mathematics advanced") >= 0 || n.indexOf("chapter") >= 0 || /^[56][a-h]/i.test(name)) return "mathematics-advanced";
  return "";
}

function titleFromFile(name){
  return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

async function extractPdf(file){
  var arrayBuffer = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  var pages = [];
  for(var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++){
    var page = await pdf.getPage(pageNumber);
    var content = await page.getTextContent();
    var pageText = "";
    var lastY = null;
    for(var i = 0; i < content.items.length; i++){
      var item = content.items[i];
      var y = item.transform && item.transform.length ? item.transform[5] : null;
      if(lastY !== null && y !== null && Math.abs(y - lastY) > 5) pageText += "\n";
      else if(pageText && item.str && item.str.trim()) pageText += " ";
      pageText += item.str || "";
      if(y !== null) lastY = y;
    }
    pages.push({page: pageNumber, text: cleanText(pageText)});
  }
  return pages;
}

function buildOutputs(){
  textOutput = extractedRows.map(function(row){
    return "## " + row.file + "\nSubject: " + (row.subject || "unmatched") + "\n\n" + row.pages.map(function(page){
      return "--- Page " + page.page + " ---\n" + page.text;
    }).join("\n\n");
  }).join("\n\n");

  jsonOutput = JSON.stringify({
    generatedAtLocal: new Date().toISOString(),
    files: extractedRows.map(function(row){
      return {
        file: row.file,
        subject: row.subject,
        title: row.title,
        path: "../Year%2012%20Material/" + encodeURIComponent(row.file),
        text: row.pages.map(function(page){ return page.text; }).join("\n\n")
      };
    })
  }, null, 2);

  output.value = textOutput;
  outputLabel.textContent = "Extracted text";
}

async function extractAll(){
  if(!selectedFiles.length) return;
  extractedRows = [];
  textOutput = "";
  jsonOutput = "";
  output.value = "";
  logBox.textContent = "";
  extractBtn.disabled = true;
  copyTextBtn.disabled = true;
  copyJsonBtn.disabled = true;
  downloadBtn.disabled = true;
  setProgress(0, selectedFiles.length);

  for(var i = 0; i < selectedFiles.length; i++){
    var file = selectedFiles[i];
    try{
      log("Extracting " + file.name + "...", "info");
      var pages = await extractPdf(file);
      extractedRows.push({
        file: file.name,
        title: titleFromFile(file.name),
        subject: subjectGuess(file.name),
        pages: pages
      });
      log("Done: " + file.name + " (" + pages.length + " pages)", "ok");
    }catch(error){
      log("Failed: " + file.name + " - " + (error.message || error), "err");
    }
    setProgress(i + 1, selectedFiles.length);
  }

  buildOutputs();
  extractBtn.disabled = false;
  copyTextBtn.disabled = !textOutput;
  copyJsonBtn.disabled = !jsonOutput;
  downloadBtn.disabled = !jsonOutput;
  log("Finished. Copy the output into course-data/admin as needed.", "ok");
}

function copyValue(value){
  output.focus();
  output.select();
  if(navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value);
  }
  document.execCommand("copy");
  return Promise.resolve();
}

dropZone.addEventListener("click", function(){ fileInput.click(); });
fileInput.addEventListener("change", function(){ setFiles(fileInput.files); });
dropZone.addEventListener("dragover", function(event){ event.preventDefault(); dropZone.classList.add("drag"); });
dropZone.addEventListener("dragleave", function(){ dropZone.classList.remove("drag"); });
dropZone.addEventListener("drop", function(event){
  event.preventDefault();
  dropZone.classList.remove("drag");
  setFiles(event.dataTransfer.files);
});
extractBtn.addEventListener("click", extractAll);
clearBtn.addEventListener("click", function(){
  selectedFiles = [];
  extractedRows = [];
  textOutput = "";
  jsonOutput = "";
  output.value = "";
  fileInput.value = "";
  fileMeta.textContent = "No files selected.";
  logBox.textContent = "Waiting for PDFs...";
  extractBtn.disabled = true;
  copyTextBtn.disabled = true;
  copyJsonBtn.disabled = true;
  downloadBtn.disabled = true;
  setProgress(0, 0);
});
copyTextBtn.addEventListener("click", function(){ copyValue(textOutput).then(function(){ log("Copied text.", "ok"); }); });
copyJsonBtn.addEventListener("click", function(){ copyValue(jsonOutput).then(function(){ log("Copied JSON.", "ok"); }); });
viewTextBtn.addEventListener("click", function(){ output.value = textOutput; outputLabel.textContent = "Extracted text"; });
viewJsonBtn.addEventListener("click", function(){ output.value = jsonOutput; outputLabel.textContent = "Course JSON output"; });
downloadBtn.addEventListener("click", function(){
  var blob = new Blob([jsonOutput], {type:"application/json;charset=utf-8"});
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "year-12-material-text.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});
