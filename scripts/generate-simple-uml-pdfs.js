#!/usr/bin/env node
/**
 * Generate UML PDFs for the College Support Platform.
 *
 * Run: node scripts/generate-simple-uml-pdfs.js
 * Out:
 *   - docs/class-diagram.pdf
 *   - docs/class-diagram-simple.pdf
 *   - docs/sequence-diagram-simple.pdf
 *   - docs/activity-diagram-simple.pdf
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const PAGE = { width: 842, height: 595 };
const C = {
  bg: hex('#FFFFFF'),
  text: hex('#1F2937'),
  muted: hex('#6B7280'),
  line: hex('#4B5563'),
  border: hex('#1D4ED8'),
  fill: hex('#DBEAFE'),
  fillSoft: hex('#F8FAFC'),
  fillWarn: hex('#FEF3C7'),
  fillOk: hex('#DCFCE7'),
  black: hex('#111827'),
  white: hex('#FFFFFF'),
};

function hex(value) {
  const clean = value.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function fmt(n) {
  return Number(n.toFixed(2)).toString();
}

function rgb(color) {
  return color.map((part) => fmt(part)).join(' ');
}

function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function estimateTextWidth(text, size) {
  let units = 0;
  for (const ch of String(text)) {
    if (ch === ' ') {
      units += 0.28;
    } else if (/[ilI1.,:;|]/.test(ch)) {
      units += 0.24;
    } else if (/[MWmw]/.test(ch)) {
      units += 0.78;
    } else if (/[A-Z]/.test(ch)) {
      units += 0.62;
    } else {
      units += 0.52;
    }
  }
  return units * size;
}

class SimplePdf {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.ops = [];
  }

  y(topY) {
    return this.height - topY;
  }

  push(op) {
    this.ops.push(op);
  }

  background(color) {
    this.rect(0, 0, this.width, this.height, { fill: color, stroke: null });
  }

  rect(x, y, width, height, options = {}) {
    const { stroke = C.line, fill = null, lineWidth = 1 } = options;
    this.push(`${fmt(lineWidth)} w`);
    if (stroke) this.push(`${rgb(stroke)} RG`);
    if (fill) this.push(`${rgb(fill)} rg`);
    this.push(`${fmt(x)} ${fmt(this.height - y - height)} ${fmt(width)} ${fmt(height)} re`);
    this.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
  }

  line(x1, y1, x2, y2, options = {}) {
    const { color = C.line, lineWidth = 1, dash = null } = options;
    this.push(`${fmt(lineWidth)} w`);
    this.push(`${rgb(color)} RG`);
    this.push(dash ? `[${dash.map(fmt).join(' ')}] 0 d` : '[] 0 d');
    this.push(`${fmt(x1)} ${fmt(this.y(y1))} m ${fmt(x2)} ${fmt(this.y(y2))} l S`);
  }

  polygon(points, options = {}) {
    const { stroke = C.line, fill = null, lineWidth = 1 } = options;
    if (!points.length) return;
    this.push(`${fmt(lineWidth)} w`);
    if (stroke) this.push(`${rgb(stroke)} RG`);
    if (fill) this.push(`${rgb(fill)} rg`);
    const [first, ...rest] = points;
    this.push(`${fmt(first.x)} ${fmt(this.y(first.y))} m`);
    for (const point of rest) {
      this.push(`${fmt(point.x)} ${fmt(this.y(point.y))} l`);
    }
    this.push('h');
    this.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
  }

  circle(cx, cy, radius, options = {}) {
    const { stroke = C.line, fill = null, lineWidth = 1 } = options;
    const k = 0.5522847498;
    const c = radius * k;
    const points = [
      [cx + radius, cy],
      [cx + radius, cy + c, cx + c, cy + radius, cx, cy + radius],
      [cx - c, cy + radius, cx - radius, cy + c, cx - radius, cy],
      [cx - radius, cy - c, cx - c, cy - radius, cx, cy - radius],
      [cx + c, cy - radius, cx + radius, cy - c, cx + radius, cy],
    ];

    this.push(`${fmt(lineWidth)} w`);
    if (stroke) this.push(`${rgb(stroke)} RG`);
    if (fill) this.push(`${rgb(fill)} rg`);
    this.push(`${fmt(points[0][0])} ${fmt(this.y(points[0][1]))} m`);
    for (const curve of points.slice(1)) {
      this.push(
        `${fmt(curve[0])} ${fmt(this.y(curve[1]))} ${fmt(curve[2])} ${fmt(this.y(curve[3]))} ${fmt(curve[4])} ${fmt(this.y(curve[5]))} c`
      );
    }
    this.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
  }

  text(x, y, text, options = {}) {
    const {
      size = 12,
      font = 'F1',
      color = C.text,
      align = 'left',
      width = null,
      lineHeight = size * 1.25,
    } = options;

    const lines = String(text).split('\n');
    lines.forEach((line, index) => {
      const boxWidth = width ?? estimateTextWidth(line, size);
      let drawX = x;
      if (align === 'center') {
        drawX = x + (boxWidth - estimateTextWidth(line, size)) / 2;
      } else if (align === 'right') {
        drawX = x + boxWidth - estimateTextWidth(line, size);
      }
      const baselineY = this.height - (y + index * lineHeight + size);
      this.push('BT');
      this.push(`/${font} ${fmt(size)} Tf`);
      this.push(`${rgb(color)} rg`);
      this.push(`1 0 0 1 ${fmt(drawX)} ${fmt(baselineY)} Tm`);
      this.push(`(${escapeText(line)}) Tj`);
      this.push('ET');
    });
  }

  arrow(x1, y1, x2, y2, options = {}) {
    const { color = C.line, lineWidth = 1, label = null, labelX = null, labelY = null } = options;
    this.line(x1, y1, x2, y2, { color, lineWidth });
    const size = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const left = {
      x: x2 - size * Math.cos(angle) + (size * 0.5) * Math.sin(angle),
      y: y2 - size * Math.sin(angle) - (size * 0.5) * Math.cos(angle),
    };
    const right = {
      x: x2 - size * Math.cos(angle) - (size * 0.5) * Math.sin(angle),
      y: y2 - size * Math.sin(angle) + (size * 0.5) * Math.cos(angle),
    };
    this.polygon([{ x: x2, y: y2 }, left, right], { stroke: color, fill: color, lineWidth: 1 });
    if (label) {
      this.text(labelX ?? ((x1 + x2) / 2 - 40), labelY ?? ((y1 + y2) / 2 - 18), label, {
        size: 9,
        color: C.text,
        width: 80,
        align: 'center',
      });
    }
  }

  save(outPath) {
    const stream = `${this.ops.join('\n')}\n`;
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(this.width)} ${fmt(this.height)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>',
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`,
    ];

    let output = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(output, 'latin1'));
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(output, 'latin1');
    output += `xref\n0 ${objects.length + 1}\n`;
    output += '0000000000 65535 f \n';
    for (let index = 1; index < offsets.length; index += 1) {
      output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    fs.writeFileSync(outPath, output, 'latin1');
  }
}

function header(pdf, title, subtitle) {
  pdf.background(C.bg);
  pdf.rect(36, 28, pdf.width - 72, 54, { fill: C.fillSoft, stroke: C.border, lineWidth: 1.5 });
  pdf.text(52, 42, title, { font: 'F2', size: 20, color: C.text });
  pdf.text(52, 66, subtitle, { font: 'F3', size: 10, color: C.muted });
}

function box(pdf, x, y, width, height, title, lines, options = {}) {
  const fill = options.fill ?? C.fill;
  pdf.rect(x, y, width, height, { fill, stroke: C.border, lineWidth: 1.25 });
  pdf.line(x, y + 28, x + width, y + 28, { color: C.border, lineWidth: 1 });
  pdf.text(x + 10, y + 9, title, { font: 'F2', size: 12, color: C.text });
  pdf.text(x + 10, y + 39, lines.join('\n'), { size: 10, color: C.text, lineHeight: 14 });
}

function note(pdf, x, y, width, height, text) {
  pdf.rect(x, y, width, height, { fill: C.fillWarn, stroke: C.line, lineWidth: 1 });
  pdf.text(x + 10, y + 12, text, { size: 10, color: C.text, lineHeight: 14 });
}

function label(pdf, x, y, text) {
  pdf.text(x, y, text, { size: 9, color: C.muted });
}

function polyline(pdf, points, options = {}) {
  for (let index = 0; index < points.length - 1; index += 1) {
    pdf.line(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y, options);
  }
}

function classBox(pdf, x, y, width, title, fields, options = {}) {
  const lineHeight = options.lineHeight ?? 12.5;
  const headerHeight = 26;
  const padding = 8;
  const bodyHeight = fields.length * lineHeight + padding * 2;
  const height = headerHeight + bodyHeight;
  const fill = options.fill ?? C.white;
  const headerFill = options.headerFill ?? C.fillSoft;
  const stroke = options.stroke ?? C.border;

  pdf.rect(x, y, width, height, { fill, stroke, lineWidth: 1.2 });
  pdf.rect(x, y, width, headerHeight, { fill: headerFill, stroke, lineWidth: 1.2 });
  pdf.line(x, y + headerHeight, x + width, y + headerHeight, { color: stroke, lineWidth: 1 });
  pdf.text(x + 8, y + 8, title, { font: 'F2', size: 12, color: C.text, width: width - 16, align: 'center' });
  pdf.text(x + 10, y + headerHeight + 8, fields.join('\n'), { size: 9.5, color: C.text, lineHeight });

  return {
    x,
    y,
    width,
    height,
    top: { x: x + width / 2, y },
    bottom: { x: x + width / 2, y: y + height },
    left: { x, y: y + height / 2 },
    right: { x: x + width, y: y + height / 2 },
    topLeft: { x: x + width * 0.25, y },
    topRight: { x: x + width * 0.75, y },
    bottomLeft: { x: x + width * 0.25, y: y + height },
    bottomRight: { x: x + width * 0.75, y: y + height },
  };
}

function classDiagram() {
  const pdf = new SimplePdf(1191, 842);
  header(pdf, 'Class Diagram', 'Main domain entities and relations from the Prisma schema');

  const profile = classBox(
    pdf,
    80,
    126,
    220,
    'Profile',
    ['+ id: String', '+ fullName: String', '+ avatarUrl: String?', '+ userId: String', '+ updatedAt: DateTime'],
    { fill: C.white, headerFill: C.fillSoft }
  );

  const user = classBox(
    pdf,
    455,
    110,
    280,
    'User',
    [
      '+ id: String',
      '+ schoolId: String',
      '+ email: String?',
      '+ passwordHash: String',
      '+ role: Role',
      '+ department: Department?',
      '+ active: Boolean',
      '+ createdAt: DateTime',
      '+ updatedAt: DateTime',
    ],
    { fill: C.white, headerFill: C.fill }
  );

  const notification = classBox(
    pdf,
    905,
    118,
    220,
    'Notification',
    ['+ id: String', '+ userId: String', '+ type: NotificationType', '+ title: String', '+ read: Boolean'],
    { fill: C.white, headerFill: C.fillSoft }
  );

  const knowledgeDocument = classBox(
    pdf,
    72,
    330,
    270,
    'KnowledgeDocument',
    [
      '+ id: String',
      '+ title: String',
      '+ department: Department',
      '+ sourceType: KnowledgeSourceType',
      '+ status: String',
      '+ uploadedBy: String',
    ],
    { fill: C.white, headerFill: C.fillOk }
  );

  const ticket = classBox(
    pdf,
    458,
    338,
    280,
    'Ticket',
    [
      '+ id: String',
      '+ department: Department',
      '+ subject: String',
      '+ description: String',
      '+ status: TicketStatus',
      '+ studentId: String',
      '+ assigneeId: String?',
      '+ createdAt: DateTime',
    ],
    { fill: C.white, headerFill: C.fill }
  );

  const trace = classBox(
    pdf,
    890,
    316,
    250,
    'OrchestratorTrace',
    [
      '+ id: String',
      '+ userId: String',
      '+ intent: String',
      '+ confidence: Float?',
      '+ routedAgents: Json',
      '+ outcome: Json',
    ],
    { fill: C.white, headerFill: C.fillSoft }
  );

  const knowledgeChunk = classBox(
    pdf,
    82,
    560,
    240,
    'KnowledgeChunk',
    ['+ id: String', '+ documentId: String', '+ chunkText: String', '+ embedding: Float[]', '+ chunkIndex: Int'],
    { fill: C.white, headerFill: C.fillOk }
  );

  const attachment = classBox(
    pdf,
    430,
    586,
    250,
    'Attachment',
    [
      '+ id: String',
      '+ ticketId: String',
      '+ uploaderId: String',
      '+ fileName: String',
      '+ mimeType: String',
      '+ sizeBytes: Int',
    ],
    { fill: C.white, headerFill: C.fillSoft }
  );

  const ticketEvent = classBox(
    pdf,
    806,
    562,
    250,
    'TicketEvent',
    ['+ id: String', '+ ticketId: String', '+ actorId: String', '+ eventType: String', '+ payload: Json?'],
    { fill: C.white, headerFill: C.fillSoft }
  );

  classBox(
    pdf,
    72,
    710,
    260,
    'FaqEntry',
    ['+ id: String', '+ department: Department', '+ question: String', '+ answer: String', '+ tags: String[]'],
    { fill: C.white, headerFill: C.fillOk }
  );

  classBox(
    pdf,
    880,
    708,
    230,
    'ApiKey',
    ['+ id: String', '+ label: String', '+ hashedKey: String', '+ scopes: String[]', '+ active: Boolean'],
    { fill: C.white, headerFill: C.fillWarn }
  );

  polyline(pdf, [profile.right, user.left], { color: C.line, lineWidth: 1.2 });
  label(pdf, 344, 150, '1');
  label(pdf, 418, 150, '1');
  pdf.text(356, 171, 'profile', { size: 9, color: C.muted });

  polyline(pdf, [user.right, notification.left], { color: C.line, lineWidth: 1.2 });
  label(pdf, 746, 156, '1');
  label(pdf, 878, 156, '0..*');
  pdf.text(790, 176, 'notifications', { size: 9, color: C.muted });

  polyline(pdf, [user.bottomLeft, { x: 410, y: 280 }, { x: 410, y: 400 }, knowledgeDocument.right], {
    color: C.line,
    lineWidth: 1.2,
  });
  label(pdf, 502, 262, '1');
  label(pdf, 352, 390, '0..*');
  pdf.text(356, 305, 'uploads documents', { size: 9, color: C.muted });

  polyline(pdf, [user.bottom, ticket.top], { color: C.line, lineWidth: 1.2 });
  label(pdf, 613, 286, '1');
  label(pdf, 613, 322, '0..*');
  pdf.text(628, 300, 'studentTickets', { size: 9, color: C.muted });

  polyline(
    pdf,
    [user.bottomRight, { x: 790, y: user.bottomRight.y }, { x: 790, y: ticket.right.y }, ticket.right],
    { color: C.line, lineWidth: 1.2 }
  );
  label(pdf, 742, 262, '0..1');
  label(pdf, 742, 414, '0..*');
  pdf.text(802, 330, 'assignedTickets', { size: 9, color: C.muted });

  polyline(pdf, [user.bottomRight, { x: 780, y: 250 }, { x: 780, y: 642 }, ticketEvent.left], {
    color: C.line,
    lineWidth: 1.2,
  });
  label(pdf, 742, 250, '1');
  label(pdf, 782, 632, '0..*');
  pdf.text(786, 440, 'ticketEvents actor', { size: 9, color: C.muted });

  polyline(pdf, [user.bottomLeft, { x: 388, y: 250 }, { x: 388, y: 642 }, attachment.left], {
    color: C.line,
    lineWidth: 1.2,
  });
  label(pdf, 468, 250, '1');
  label(pdf, 392, 632, '0..*');
  pdf.text(280, 440, 'attachments uploader', { size: 9, color: C.muted });

  polyline(pdf, [user.right, { x: 850, y: user.right.y }, { x: 850, y: trace.left.y }, trace.left], {
    color: C.line,
    lineWidth: 1.2,
  });
  label(pdf, 748, 196, '1');
  label(pdf, 854, 420, '0..*');
  pdf.text(856, 272, 'traces', { size: 9, color: C.muted });

  polyline(pdf, [ticket.bottom, attachment.top], { color: C.line, lineWidth: 1.2 });
  label(pdf, 604, 514, '1');
  label(pdf, 604, 574, '0..*');
  pdf.text(620, 544, 'attachments', { size: 9, color: C.muted });

  polyline(pdf, [ticket.right, { x: 772, y: ticket.right.y }, { x: 772, y: ticketEvent.left.y }, ticketEvent.left], {
    color: C.line,
    lineWidth: 1.2,
  });
  label(pdf, 740, 432, '1');
  label(pdf, 774, 640, '0..*');
  pdf.text(778, 520, 'events', { size: 9, color: C.muted });

  polyline(pdf, [knowledgeDocument.bottom, knowledgeChunk.top], { color: C.line, lineWidth: 1.2 });
  label(pdf, 218, 502, '1');
  label(pdf, 218, 548, '0..*');
  pdf.text(232, 522, 'chunks', { size: 9, color: C.muted });

  note(
    pdf,
    430,
    730,
    310,
    64,
    'Enums used by these classes:\nRole, Department, TicketStatus,\nNotificationType, KnowledgeSourceType'
  );

  pdf.text(432, 808, 'FaqEntry is separate from KnowledgeDocument in the schema.', {
    size: 9,
    color: C.muted,
  });
  pdf.text(874, 688, 'ApiKey secures the external public API.', { size: 9, color: C.muted });

  pdf.save(path.join(OUT_DIR, 'class-diagram.pdf'));
  pdf.save(path.join(OUT_DIR, 'class-diagram-simple.pdf'));
}

function participant(pdf, x, labelText) {
  pdf.rect(x - 48, 118, 96, 34, { fill: C.fillSoft, stroke: C.border, lineWidth: 1.1 });
  pdf.text(x - 44, 129, labelText, { font: 'F2', size: 10, color: C.text, width: 88, align: 'center' });
  pdf.line(x, 152, x, 510, { color: C.line, lineWidth: 1, dash: [5, 4] });
}

function sequenceDiagram() {
  const pdf = new SimplePdf(PAGE.width, PAGE.height);
  header(
    pdf,
    'Simple Sequence Diagram',
    'Student asks the assistant and receives a knowledge-based answer'
  );

  const xs = {
    student: 84,
    web: 224,
    api: 374,
    orchestrator: 540,
    knowledge: 714,
  };

  participant(pdf, xs.student, 'Student');
  participant(pdf, xs.web, 'Web App');
  participant(pdf, xs.api, 'Assistant API');
  participant(pdf, xs.orchestrator, 'Orchestrator');
  participant(pdf, xs.knowledge, 'Knowledge Agent');

  pdf.arrow(xs.student, 186, xs.web, 186, { label: '1. Ask question', labelY: 168 });
  pdf.arrow(xs.web, 232, xs.api, 232, { label: '2. POST /assistant/message', labelY: 214 });
  pdf.arrow(xs.api, 278, xs.orchestrator, 278, { label: '3. Route request', labelY: 260 });
  pdf.arrow(xs.orchestrator, 324, xs.knowledge, 324, { label: '4. Search FAQ/docs', labelY: 306 });
  pdf.arrow(xs.knowledge, 370, xs.orchestrator, 370, { label: '5. Best answer', labelY: 352 });
  pdf.arrow(xs.orchestrator, 416, xs.api, 416, { label: '6. Final reply', labelY: 398 });
  pdf.arrow(xs.api, 462, xs.web, 462, { label: '7. JSON response', labelY: 444 });
  pdf.arrow(xs.web, 508, xs.student, 508, { label: '8. Show answer', labelY: 490 });

  note(
    pdf,
    564,
    440,
    210,
    62,
    'If confidence is low,\nthe workflow agent can\ncreate a support ticket.'
  );

  pdf.save(path.join(OUT_DIR, 'sequence-diagram-simple.pdf'));
}

function actionBox(pdf, x, y, width, height, text, fill = C.fillSoft) {
  pdf.rect(x, y, width, height, { fill, stroke: C.border, lineWidth: 1.2 });
  pdf.text(x + 10, y + 12, text, { font: 'F2', size: 11, color: C.text, width: width - 20, align: 'center' });
}

function decisionDiamond(pdf, cx, cy, width, height, text) {
  const halfW = width / 2;
  const halfH = height / 2;
  pdf.polygon(
    [
      { x: cx, y: cy - halfH },
      { x: cx + halfW, y: cy },
      { x: cx, y: cy + halfH },
      { x: cx - halfW, y: cy },
    ],
    { fill: C.fillWarn, stroke: C.line, lineWidth: 1.2 }
  );
  pdf.text(cx - halfW + 12, cy - 12, text, {
    font: 'F2',
    size: 10,
    color: C.text,
    width: width - 24,
    align: 'center',
  });
}

function endNode(pdf, cx, cy) {
  pdf.circle(cx, cy, 10, { fill: C.black, stroke: C.black, lineWidth: 1 });
  pdf.circle(cx, cy, 16, { fill: null, stroke: C.black, lineWidth: 1.2 });
}

function activityDiagram() {
  const pdf = new SimplePdf(PAGE.width, PAGE.height);
  header(
    pdf,
    'Simple Activity Diagram',
    'Basic support flow from student request to answer or ticket handling'
  );

  pdf.circle(420, 118, 8, { fill: C.black, stroke: C.black, lineWidth: 1 });
  pdf.arrow(420, 126, 420, 156, { color: C.line });
  actionBox(pdf, 340, 156, 160, 40, 'Login');

  pdf.arrow(420, 196, 420, 232, { color: C.line });
  actionBox(pdf, 332, 232, 176, 40, 'Ask assistant');

  pdf.arrow(420, 272, 420, 314, { color: C.line });
  decisionDiamond(pdf, 420, 342, 150, 86, 'Answer enough?');

  pdf.arrow(495, 342, 580, 342, { color: C.line, label: 'yes', labelX: 518, labelY: 322 });
  actionBox(pdf, 580, 322, 150, 40, 'Show answer', C.fillOk);
  pdf.arrow(655, 362, 655, 412, { color: C.line });
  endNode(pdf, 655, 438);

  pdf.arrow(420, 385, 420, 420, { color: C.line, label: 'no', labelX: 432, labelY: 388 });
  actionBox(pdf, 334, 420, 172, 40, 'Create ticket');
  pdf.arrow(420, 460, 420, 478, { color: C.line });
  actionBox(pdf, 320, 478, 200, 40, 'Staff updates ticket');
  pdf.arrow(420, 518, 420, 536, { color: C.line });
  actionBox(pdf, 330, 536, 180, 28, 'Notify student');
  pdf.arrow(420, 564, 420, 572, { color: C.line });
  endNode(pdf, 420, 578);

  note(
    pdf,
    62,
    470,
    188,
    74,
    'The activity uses two end nodes:\none for a direct answer,\none for the ticket path.'
  );

  pdf.save(path.join(OUT_DIR, 'activity-diagram-simple.pdf'));
}

classDiagram();
sequenceDiagram();
activityDiagram();

console.log('Generated:');
console.log('- docs/class-diagram.pdf');
console.log('- docs/class-diagram-simple.pdf');
console.log('- docs/sequence-diagram-simple.pdf');
console.log('- docs/activity-diagram-simple.pdf');
