const socket = io();

const startScanButton = document.getElementById('startScanButton');
const generatePdfButton = document.getElementById('generatePdfButton');
const urlInput = document.getElementById('urlInput');
const scanType = document.getElementById('scanType');
const nmapType = document.getElementById('nmapType');
const sqlmapOutput = document.getElementById('sqlmapOutput');
const nmapOutput = document.getElementById('nmapOutput');
const nucleiOutput = document.getElementById('nucleiOutput');
const loadingAnimation = document.getElementById('loadingAnimation');

let currentSessionId;
let sqlmapData = '';
let nmapData = '';
let nucleiData = '';

scanType.addEventListener('change', () => {
  if (scanType.value === 'nmap') {
    nmapType.style.display = 'block';
  } else {
    nmapType.style.display = 'none';
  }
});

startScanButton.addEventListener('click', () => {
  const url = urlInput.value;
  const type = scanType.value;
  const nmapScanType = nmapType.value;
  if (!url) return alert('Please enter a URL');

  sqlmapOutput.textContent = '';
  nmapOutput.textContent = '';
  nucleiOutput.textContent = '';
  loadingAnimation.style.display = 'block';

  sqlmapData = '';
  nmapData = '';
  nucleiData = '';

  socket.emit('startScan', { url, type, nmapScanType });
});

generatePdfButton.addEventListener('click', () => {
  if (!currentSessionId) return alert('No session available');

  socket.emit('generatePDF', { sessionId: currentSessionId, sqlmapData, nmapData, nucleiData });
});

socket.on('sessionStarted', ({ sessionId }) => {
  currentSessionId = sessionId;
  generatePdfButton.disabled = false;
});

socket.on('toolOutput', ({ tool, data }) => {
  if (tool === 'sqlmap') {
    sqlmapOutput.textContent += data;
    sqlmapData += data;
  } else if (tool === 'nmap') {
    nmapOutput.textContent += data;
    nmapData += data;
  } else if (tool === 'nuclei') {
    nucleiOutput.textContent += data;
    nucleiData += data;
  }
});

socket.on('toolFinished', ({ tool }) => {
  if (tool === 'sqlmap' || tool === 'nmap' || tool === 'nuclei') {
    loadingAnimation.style.display = 'none';
  }
});

socket.on('pdfGenerated', ({ filePath }) => {
  const downloadLink = document.createElement('a');
  downloadLink.href = `/download/${filePath}`;
  downloadLink.download = 'Vulnerability_Scan_Report.pdf';
  downloadLink.click();
});
