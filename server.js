const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.on('startScan', ({ url, type, nmapScanType }) => {
    const sessionId = Date.now();
    socket.emit('sessionStarted', { sessionId });

    if (type === 'all' || type === 'sqlmap') {
      const sqlmap = spawn('sqlmap', ['-u', url, '--batch']);
      sqlmap.stdout.on('data', (data) => {
        socket.emit('toolOutput', { tool: 'sqlmap', data: data.toString() });
      });
      sqlmap.stderr.on('data', (data) => {
        socket.emit('toolOutput', { tool: 'sqlmap', data: data.toString() });
      });
      sqlmap.on('close', () => {
        socket.emit('toolFinished', { tool: 'sqlmap' });
      });
    }

    if (type === 'all' || type === 'nmap') {
      let nmapArgs;
      switch (nmapScanType) {
        case 'no-ping':
          nmapArgs = ['-Pn', url];
          break;
        case 'aggressive':
          nmapArgs = ['-A', url];
          break;
        case 'script':
          nmapArgs = ['-sC', url];
          break;
        case 'service':
          nmapArgs = ['-sV', url];
          break;
        default:
          nmapArgs = [url];
      }
      const nmap = spawn('nmap', nmapArgs);
      nmap.stdout.on('data', (data) => {
        socket.emit('toolOutput', { tool: 'nmap', data: data.toString() });
      });
      nmap.stderr.on('data', (data) => {
        socket.emit('toolOutput', { tool: 'nmap', data: data.toString() });
      });
      nmap.on('close', () => {
        socket.emit('toolFinished', { tool: 'nmap' });
      });
    }

    if (type === 'all' || type === 'nuclei') {
      const nuclei = spawn('nuclei', ['-u', url]);
      nuclei.stdout.on('data', (data) => {
        socket.emit('toolOutput', { tool: 'nuclei', data: data.toString() });
      });
      nuclei.stderr.on('data', (data) => {
        socket.emit('toolOutput', { tool: 'nuclei', data: data.toString() });
      });
      nuclei.on('close', () => {
        socket.emit('toolFinished', { tool: 'nuclei' });
      });
    }
  });

  socket.on('generatePDF', ({ sessionId, sqlmapData, nmapData, nucleiData }) => {
    const doc = new PDFDocument();
    const filePath = `reports/report_${sessionId}.pdf`;

    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(25).text('Vulnerability Scan Report', { align: 'center' });
    doc.image('public/logo.png', { fit: [150, 150], align: 'center' });
    doc.moveDown();

    doc.fontSize(18).text('SQLmap Output', { underline: true });
    doc.fontSize(12).text(sqlmapData);

    doc.addPage();
    doc.fontSize(18).text('Nmap Output', { underline: true });
    doc.fontSize(12).text(nmapData);

    doc.addPage();
    doc.fontSize(18).text('Nuclei Output', { underline: true });
    doc.fontSize(12).text(nucleiData);

    doc.end();

    socket.emit('pdfGenerated', { filePath: `report_${sessionId}.pdf` });
  });
});

app.get('/download/:file', (req, res) => {
  const file = req.params.file;
  const filePath = path.join(__dirname, 'reports', file);
  res.download(filePath);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
