#!/usr/bin/env node
/**
 * Generate a simplified UML Use-Case Diagram PDF
 * for the College Support Platform.
 *
 * Run:  node scripts/generate-use-case-simple.js
 * Out:  docs/use-case-diagram-simple.pdf
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'use-case-diagram-simple.pdf');

// ── colours ──────────────────────────────────────────────────────────
const C = {
  bg:           '#FFFFFF',
  headerBg:     '#1E293B',
  headerText:   '#FFFFFF',
  systemBorder: '#3B82F6',
  systemFill:   '#F8FAFC',
  ellipseFill:  '#DBEAFE',
  ellipseStroke:'#2563EB',
  ellipseText:  '#1E3A5F',
  actorColor:   '#1E293B',
  actorLabel:   '#1E293B',
  lineColor:    '#64748B',
  includeColor: '#059669',
  extendColor:  '#D97706',
  footerText:   '#94A3B8',
};

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margins: { top: 30, bottom: 30, left: 40, right: 40 },
});
doc.pipe(fs.createWriteStream(outPath));

const W = 841.89;
const H = 595.28;

// ── helpers ──────────────────────────────────────────────────────────
function drawEllipse(cx, cy, rx, ry, fill, stroke, lw = 1.5) {
  const k = 0.5522848, ox = rx * k, oy = ry * k;
  doc.save().lineWidth(lw);
  doc.moveTo(cx - rx, cy)
    .bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry)
    .bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy)
    .bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry)
    .bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy)
    .closePath().fillAndStroke(fill, stroke);
  doc.restore();
}

function drawStickFigure(cx, cy, color) {
  doc.save().lineWidth(2).strokeColor(color);
  doc.circle(cx, cy - 20, 8).stroke();
  doc.moveTo(cx, cy - 12).lineTo(cx, cy + 8).stroke();
  doc.moveTo(cx - 12, cy - 4).lineTo(cx + 12, cy - 4).stroke();
  doc.moveTo(cx, cy + 8).lineTo(cx - 10, cy + 22).stroke();
  doc.moveTo(cx, cy + 8).lineTo(cx + 10, cy + 22).stroke();
  doc.restore();
}

function drawActor(cx, cy, label) {
  drawStickFigure(cx, cy, C.actorColor);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.actorLabel);
  doc.text(label, cx - 45, cy + 28, { width: 90, align: 'center' });
}

function drawUseCase(cx, cy, label) {
  const rx = 95, ry = 24;
  drawEllipse(cx, cy, rx, ry, C.ellipseFill, C.ellipseStroke);
  doc.font('Helvetica').fontSize(9).fillColor(C.ellipseText);
  const lines = label.split('\n');
  const startY = cy - (lines.length * 11) / 2;
  lines.forEach((l, i) => {
    doc.text(l.trim(), cx - rx + 10, startY + i * 12, { width: (rx - 10) * 2, align: 'center' });
  });
  return { cx, cy, rx, ry };
}

function line(x1, y1, x2, y2, color, dashed) {
  doc.save().lineWidth(1.2).strokeColor(color);
  if (dashed) doc.dash(5, { space: 3 });
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.restore();
}

function assoc(ax, ay, uc) {
  const dx = uc.cx - ax, dy = uc.cy - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ex = uc.cx - (dx / dist) * uc.rx;
  const ey = uc.cy - (dy / dist) * uc.ry;
  line(ax, ay, ex, ey, C.lineColor, false);
}

function dep(from, to, label, color) {
  const dx = to.cx - from.cx;
  const x1 = from.cx + (dx > 0 ? from.rx : -from.rx);
  const x2 = to.cx + (dx > 0 ? -to.rx : to.rx);
  line(x1, from.cy, x2, to.cy, color, true);
  const mx = (x1 + x2) / 2, my = (from.cy + to.cy) / 2 - 9;
  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(color);
  doc.text(label, mx - 30, my, { width: 60, align: 'center' });
}

// ══════════════════════════════════════════════════════════════════════
// DRAW
// ══════════════════════════════════════════════════════════════════════

// Background
doc.rect(0, 0, W + 50, H + 50).fill(C.bg);

// Header
doc.rect(0, 0, W + 50, 48).fill(C.headerBg);
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.headerText);
doc.text('College Support Platform — Use-Case Diagram', 40, 14, { width: W - 40, align: 'center' });

// System boundary
const sX = 175, sY = 65, sW = 500, sH = 470;
doc.save().roundedRect(sX, sY, sW, sH, 10).lineWidth(2).fillAndStroke(C.systemFill, C.systemBorder).restore();
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.systemBorder);
doc.text('College Support System', sX, sY + 8, { width: sW, align: 'center' });

// ── Actors ───────────────────────────────────────────────────────────
const student = { x: 70, y: 220 };
const staff   = { x: 70, y: 430 };
const admin   = { x: 785, y: 300 };

drawActor(student.x, student.y, 'Student');
drawActor(staff.x,   staff.y,   'Staff');
drawActor(admin.x,   admin.y,   'Admin');

// ── Use Cases (3 columns) ───────────────────────────────────────────
const c1 = 320, c2 = 520, row = (n) => 115 + n * 62;

const ucLogin       = drawUseCase(c1, row(0), 'Login / Register');
const ucCreateTkt   = drawUseCase(c1, row(1), 'Create Ticket');
const ucViewTkts    = drawUseCase(c1, row(2), 'View My Tickets');
const ucManageTkt   = drawUseCase(c1, row(3), 'Manage Ticket');
const ucAskAI       = drawUseCase(c1, row(4), 'Ask AI Assistant');
const ucSearchKB    = drawUseCase(c2, row(1), 'Search\nKnowledge Base');
const ucNotifs      = drawUseCase(c2, row(2), 'View\nNotifications');
const ucManageKB    = drawUseCase(c2, row(3), 'Manage\nKnowledge Base');
const ucAdminPanel  = drawUseCase(c2, row(4), 'Admin Panel');
const ucPublicAPI   = drawUseCase(c2, row(5), 'Public API\nAccess');

// ── Associations ─────────────────────────────────────────────────────
// Student
assoc(student.x + 25, student.y - 10, ucLogin);
assoc(student.x + 25, student.y - 5,  ucCreateTkt);
assoc(student.x + 25, student.y,      ucViewTkts);
assoc(student.x + 25, student.y + 5,  ucSearchKB);
assoc(student.x + 25, student.y + 10, ucNotifs);
assoc(student.x + 25, student.y + 15, ucAskAI);

// Staff
assoc(staff.x + 25, staff.y - 10, ucLogin);
assoc(staff.x + 25, staff.y - 5,  ucManageTkt);
assoc(staff.x + 25, staff.y + 5,  ucAskAI);

// Admin
assoc(admin.x - 25, admin.y - 15, ucLogin);
assoc(admin.x - 25, admin.y - 5,  ucManageKB);
assoc(admin.x - 25, admin.y,      ucAdminPanel);
assoc(admin.x - 25, admin.y + 5,  ucManageTkt);
assoc(admin.x - 25, admin.y + 15, ucPublicAPI);

// ── Dependencies ─────────────────────────────────────────────────────
dep(ucAskAI, ucSearchKB, '«include»', C.includeColor);
dep(ucAskAI, ucCreateTkt, '«extend»', C.extendColor);

// ── Legend ────────────────────────────────────────────────────────────
const lx = 40, ly = H - 55;
doc.save().roundedRect(lx, ly, 310, 35, 5).lineWidth(0.8).fillAndStroke('#FFFFFF', '#CBD5E1').restore();

line(lx + 12, ly + 12, lx + 42, ly + 12, C.lineColor, false);
doc.font('Helvetica').fontSize(7.5).fillColor('#64748B');
doc.text('Association', lx + 46, ly + 8);

line(lx + 110, ly + 12, lx + 140, ly + 12, C.includeColor, true);
doc.fillColor(C.includeColor).text('«include»', lx + 144, ly + 8);

line(lx + 210, ly + 12, lx + 240, ly + 12, C.extendColor, true);
doc.fillColor(C.extendColor).text('«extend»', lx + 244, ly + 8);

// Footer
doc.font('Helvetica').fontSize(7).fillColor(C.footerText);
doc.text(
  `College Support Platform  •  Simplified Use-Case Diagram  •  ${new Date().toISOString().slice(0, 10)}`,
  40, H - 18, { width: W - 40, align: 'center' },
);

doc.end();
console.log(`✔  PDF saved to ${outPath}`);
