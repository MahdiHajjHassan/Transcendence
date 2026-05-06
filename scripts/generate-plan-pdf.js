const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const root = process.cwd();
const sourcePath = path.join(root, 'README.md');
const outPath = path.join(root, 'College-Support-Plan.pdf');

if (!fs.existsSync(sourcePath)) {
  console.error('README.md not found.');
  process.exit(1);
}

const markdown = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
const lines = markdown.split('\n');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 72, bottom: 64, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: 'College Support Multi-Agent Plan',
    Author: 'trancedance team',
    Subject: 'Project plan',
  },
});

const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

const colors = {
  navy: '#0F1A3D',
  cobalt: '#1E4ED8',
  sky: '#DDEBFF',
  text: '#1B1B1B',
  muted: '#5A5F73',
  accent: '#0EA5E9',
  line: '#E3E8F3',
  bg: '#F9FBFF',
};

function ensureSpace(heightNeeded) {
  if (doc.y + heightNeeded > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function drawCover() {
  const pageWidth = doc.page.width;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  doc.rect(0, 0, pageWidth, 180).fill(colors.navy);
  doc.rect(0, 176, pageWidth, 8).fill(colors.accent);

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(30)
    .text('College Support', left, 54, { width: right - left });
  doc.fontSize(26).text('Multi-Agent Plan', left, 92, { width: right - left });

  doc.fillColor('#E4EDFF').font('Helvetica').fontSize(11)
    .text('Readable project plan with implementation-ready structure', left, 136, {
      width: right - left,
    });

  doc.y = 220;

  const metaText = [
    'Project Context: Student support platform (Registration + IT)',
    'Architecture: 1 Orchestrator + 2 Agents (Knowledge + Workflow)',
    `Generated: ${new Date().toLocaleString()}`,
  ];

  doc.roundedRect(left, doc.y, right - left, 82, 10).fill(colors.bg);
  doc.strokeColor(colors.line).lineWidth(1).roundedRect(left, doc.y, right - left, 82, 10).stroke();

  doc.fillColor(colors.text).font('Helvetica').fontSize(11);
  let y = doc.y + 16;
  for (const text of metaText) {
    doc.text(text, left + 14, y, { width: right - left - 28 });
    y += 22;
  }

  doc.y = doc.y + 110;
}

function sectionHeader(title) {
  ensureSpace(44);
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;

  doc.roundedRect(x, y, w, 30, 7).fill(colors.sky);
  doc.fillColor(colors.cobalt).font('Helvetica-Bold').fontSize(14)
    .text(title, x + 10, y + 8, { width: w - 20 });
  doc.moveDown(1.2);
}

function subHeader(title) {
  ensureSpace(26);
  doc.fillColor(colors.navy).font('Helvetica-Bold').fontSize(12).text(title);
  doc.moveDown(0.4);
}

function paragraph(text) {
  if (!text.trim()) {
    doc.moveDown(0.35);
    return;
  }
  ensureSpace(24);
  doc.fillColor(colors.text).font('Helvetica').fontSize(10.5)
    .text(text, { lineGap: 2 });
  doc.moveDown(0.25);
}

function bullet(text) {
  ensureSpace(22);
  const startX = doc.page.margins.left;
  const bulletX = startX + 2;
  const textX = startX + 14;
  const y = doc.y + 2;

  doc.circle(bulletX, y + 4, 2.3).fill(colors.cobalt);
  doc.fillColor(colors.text).font('Helvetica').fontSize(10.5)
    .text(text, textX, doc.y, {
      width: doc.page.width - doc.page.margins.right - textX,
      lineGap: 2,
    });
  doc.moveDown(0.1);
}

function numberItem(text) {
  ensureSpace(22);
  doc.fillColor(colors.text).font('Helvetica').fontSize(10.5)
    .text(text, {
      indent: 10,
      lineGap: 2,
    });
  doc.moveDown(0.1);
}

function codeLine(text) {
  ensureSpace(20);
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  doc.roundedRect(x, y, w, 18, 4).fill('#F3F6FC');
  doc.fillColor('#2B3A67').font('Courier').fontSize(9.5)
    .text(text, x + 8, y + 5, { width: w - 16 });
  doc.y = y + 20;
}

function stripInlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
}

drawCover();

let inCode = false;
for (const raw of lines) {
  const line = raw.replace(/\t/g, '    ');
  const trimmed = line.trim();

  if (trimmed.startsWith('```')) {
    inCode = !inCode;
    if (!inCode) {
      doc.moveDown(0.2);
    }
    continue;
  }

  if (inCode) {
    codeLine(line);
    continue;
  }

  if (trimmed.startsWith('# ')) {
    ensureSpace(42);
    doc.fillColor(colors.navy).font('Helvetica-Bold').fontSize(20)
      .text(stripInlineMd(trimmed.slice(2)));
    doc.moveDown(0.2);
    continue;
  }

  if (trimmed.startsWith('## ')) {
    sectionHeader(stripInlineMd(trimmed.slice(3)));
    continue;
  }

  if (trimmed.startsWith('### ')) {
    subHeader(stripInlineMd(trimmed.slice(4)));
    continue;
  }

  if (trimmed.startsWith('- ')) {
    bullet(stripInlineMd(trimmed.slice(2)));
    continue;
  }

  if (/^\d+\.\s+/.test(trimmed)) {
    numberItem(stripInlineMd(trimmed));
    continue;
  }

  if (!trimmed) {
    paragraph('');
    continue;
  }

  // Markdown table lines are converted to plain readable rows.
  if (trimmed.includes('|')) {
    const row = trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join('   •   ');
    if (!/^[-: ]+$/.test(row)) {
      paragraph(stripInlineMd(row));
    }
    continue;
  }

  paragraph(stripInlineMd(line));
}

const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i += 1) {
  doc.switchToPage(i);
  const text = `Page ${i + 1} of ${range.count}`;
  doc.fillColor(colors.muted).font('Helvetica').fontSize(9)
    .text(text, 0, doc.page.height - 42, {
      align: 'center',
      width: doc.page.width,
    });
}

doc.end();

stream.on('finish', () => {
  console.log(`PDF generated: ${outPath}`);
});

stream.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
