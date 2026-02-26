#!/usr/bin/env node
/**
 * Generate a professional UML Use-Case Diagram as a styled PDF
 * for the College Support Platform.
 *
 * Run:  node scripts/generate-use-case-pdf.js
 * Out:  docs/use-case-diagram.pdf
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'use-case-diagram.pdf');

// ── colours ──────────────────────────────────────────────────────────
const C = {
  bg:           '#FAFBFC',
  headerBg:     '#1B2A4A',
  headerText:   '#FFFFFF',
  systemBorder: '#3B82F6',
  systemFill:   '#EFF6FF',
  ellipseFill:  '#FFFFFF',
  ellipseStroke:'#3B82F6',
  ellipseText:  '#1E3A5F',
  actorColor:   '#1B2A4A',
  actorLabel:   '#1E3A5F',
  lineColor:    '#94A3B8',
  includeColor: '#10B981',
  extendColor:  '#F59E0B',
  footerText:   '#64748B',
  sectionLabel: '#6B7280',
};

// ── page setup ───────────────────────────────────────────────────────
const doc = new PDFDocument({
  size: 'A3',
  layout: 'landscape',
  margins: { top: 40, bottom: 40, left: 50, right: 50 },
});
doc.pipe(fs.createWriteStream(outPath));

const W = 1190.55;   // A3 landscape width  (≈ usable)
const H = 841.89;    // A3 landscape height

// ── helpers ──────────────────────────────────────────────────────────
function hex(c) {
  const h = c.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function drawEllipse(cx, cy, rx, ry, fill, stroke, lw = 1.2) {
  // approximate ellipse with bezier
  const kappa = 0.5522848;
  const ox = rx * kappa;
  const oy = ry * kappa;
  doc.save();
  doc.lineWidth(lw);
  doc
    .moveTo(cx - rx, cy)
    .bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry)
    .bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy)
    .bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry)
    .bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy)
    .closePath();
  doc.fillAndStroke(fill, stroke);
  doc.restore();
}

function drawStickFigure(cx, cy, color) {
  const s = 0.9;
  doc.save();
  doc.lineWidth(2).strokeColor(color);
  // head
  doc.circle(cx, cy - 22 * s, 8 * s).stroke();
  // body
  doc.moveTo(cx, cy - 14 * s).lineTo(cx, cy + 8 * s).stroke();
  // arms
  doc.moveTo(cx - 12 * s, cy - 6 * s).lineTo(cx + 12 * s, cy - 6 * s).stroke();
  // legs
  doc.moveTo(cx, cy + 8 * s).lineTo(cx - 10 * s, cy + 24 * s).stroke();
  doc.moveTo(cx, cy + 8 * s).lineTo(cx + 10 * s, cy + 24 * s).stroke();
  doc.restore();
}

function drawActor(cx, cy, label) {
  drawStickFigure(cx, cy, C.actorColor);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.actorLabel);
  doc.text(label, cx - 50, cy + 30, { width: 100, align: 'center' });
}

function drawUseCase(cx, cy, label) {
  const rx = 90;
  const ry = 22;
  drawEllipse(cx, cy, rx, ry, C.ellipseFill, C.ellipseStroke, 1.5);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.ellipseText);
  const lines = label.split('\n');
  const startY = cy - (lines.length * 10) / 2;
  lines.forEach((line, i) => {
    doc.text(line.trim(), cx - rx + 8, startY + i * 11, { width: (rx - 8) * 2, align: 'center' });
  });
  return { cx, cy, rx, ry };
}

function drawLine(x1, y1, x2, y2, color, dash) {
  doc.save();
  doc.lineWidth(1).strokeColor(color);
  if (dash) doc.dash(5, { space: 3 });
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.restore();
}

function drawAssociation(ax, ay, ucx, ucy) {
  drawLine(ax, ay, ucx, ucy, C.lineColor, false);
}

function drawDependency(fromUC, toUC, label, color) {
  const x1 = fromUC.cx + (fromUC.cx < toUC.cx ? fromUC.rx : -fromUC.rx);
  const y1 = fromUC.cy;
  const x2 = toUC.cx + (toUC.cx < fromUC.cx ? toUC.rx : -toUC.rx);
  const y2 = toUC.cy;
  drawLine(x1, y1, x2, y2, color, true);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 8;
  doc.font('Helvetica-Oblique').fontSize(7).fillColor(color);
  doc.text(label, mx - 30, my, { width: 60, align: 'center' });
}

// ── PAGE BACKGROUND ──────────────────────────────────────────────────
doc.rect(0, 0, W + 100, H + 100).fill(C.bg);

// ── HEADER BAR ───────────────────────────────────────────────────────
doc.rect(0, 0, W + 100, 58).fill(C.headerBg);
doc.font('Helvetica-Bold').fontSize(20).fillColor(C.headerText);
doc.text('College Support Platform — UML Use-Case Diagram', 50, 18, { width: W, align: 'center' });

// ── SYSTEM BOUNDARY ──────────────────────────────────────────────────
const sysX = 200, sysY = 80, sysW = 790, sysH = 690;
doc.save();
doc.roundedRect(sysX, sysY, sysW, sysH, 12).lineWidth(2.5).fillAndStroke(C.systemFill, C.systemBorder);
doc.restore();
doc.font('Helvetica-Bold').fontSize(13).fillColor(C.systemBorder);
doc.text('College Support System', sysX, sysY + 8, { width: sysW, align: 'center' });

// ── ACTORS ───────────────────────────────────────────────────────────
const actors = {
  student:  { x: 90,   y: 260 },
  staff:    { x: 90,   y: 520 },
  admin:    { x: 1100,  y: 260 },
  external: { x: 1100,  y: 530 },
  ai:       { x: 1100,  y: 700 },
};

drawActor(actors.student.x, actors.student.y, 'Student');
drawActor(actors.staff.x,   actors.staff.y,   'Staff');
drawActor(actors.admin.x,   actors.admin.y,   'Admin');
drawActor(actors.external.x, actors.external.y, 'External\nSystem');
drawActor(actors.ai.x,      actors.ai.y,      'Gemini AI');

// ── USE CASES ────────────────────────────────────────────────────────
// Column 1 — left section (x ≈ 350)
const col1 = 360;
// Column 2 — center (x ≈ 530)
const col2 = 540;
// Column 3 — right section (x ≈ 720)
const col3 = 730;
// Column 4 — far-right (x ≈ 870)
const col4 = 870;

// ── Section labels
doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.sectionLabel);
doc.text('Authentication', sysX + 15, 105);
doc.text('Tickets & Support', sysX + 15, 280);
doc.text('Knowledge Base', sysX + sysW - 150, 105);
doc.text('Administration', sysX + sysW - 150, 450);
doc.text('AI Assistant', sysX + sysW / 2 - 30, 590);

// Auth use cases (row 1)
const ucRegister   = drawUseCase(col1, 145, 'Register\n(Student)');
const ucLogin      = drawUseCase(col2 + 20, 145, 'Login');
const ucViewProfile = drawUseCase(col1, 205, 'View / Edit\nProfile');

// Ticket use cases (rows 2–4)
const ucCreateTicket  = drawUseCase(col1, 310, 'Create Support\nTicket');
const ucViewMyTickets = drawUseCase(col1, 375, 'View My\nTickets');
const ucAddAttachment = drawUseCase(col2 + 20, 310, 'Add\nAttachment');
const ucViewTicket    = drawUseCase(col2 + 20, 375, 'View Ticket\nDetails');
const ucUpdateTicket  = drawUseCase(col1, 440, 'Update\nTicket');
const ucViewQueue     = drawUseCase(col2 + 20, 440, 'View Ticket\nQueue');
const ucClaimTicket   = drawUseCase(col1, 505, 'Claim\nTicket');
const ucUpdateStatus  = drawUseCase(col2 + 20, 505, 'Update Ticket\nStatus');

// Notification
const ucNotifications = drawUseCase(col3 - 20, 205, 'Check\nNotifications');

// Knowledge use cases
const ucSearchKB   = drawUseCase(col3, 145, 'Search\nKnowledge Base');
const ucCreateFaq  = drawUseCase(col4, 310, 'Create FAQ\nEntry');
const ucUploadDoc  = drawUseCase(col4, 375, 'Upload Knowledge\nDocument');

// Admin use cases
const ucProvision    = drawUseCase(col4, 475, 'Provision\nUser');
const ucCreateApiKey = drawUseCase(col4, 540, 'Create\nAPI Key');
const ucViewTraces   = drawUseCase(col4, 605, 'View AI\nTraces');

// AI Assistant
const ucAskAssistant = drawUseCase(col2 + 50, 630, 'Ask AI\nAssistant');
const ucKnowledgeAI  = drawUseCase(col3 + 20, 680, 'Knowledge\nRetrieval');
const ucWorkflowAI   = drawUseCase(col1 + 20, 680, 'Workflow\nExecution');

// Public API
const ucPubSearch  = drawUseCase(col3, 530, 'Public API:\nSearch KB');
const ucPubTicket  = drawUseCase(col3, 600, 'Public API:\nManage Tickets');

// ── ASSOCIATIONS (actor → use case) ─────────────────────────────────
// Student
drawAssociation(actors.student.x + 30, actors.student.y - 15, ucRegister.cx - ucRegister.rx, ucRegister.cy);
drawAssociation(actors.student.x + 30, actors.student.y - 10, ucLogin.cx - ucLogin.rx, ucLogin.cy);
drawAssociation(actors.student.x + 30, actors.student.y,      ucViewProfile.cx - ucViewProfile.rx, ucViewProfile.cy);
drawAssociation(actors.student.x + 30, actors.student.y + 5,  ucCreateTicket.cx - ucCreateTicket.rx, ucCreateTicket.cy);
drawAssociation(actors.student.x + 30, actors.student.y + 10, ucViewMyTickets.cx - ucViewMyTickets.rx, ucViewMyTickets.cy);
drawAssociation(actors.student.x + 30, actors.student.y + 15, ucAddAttachment.cx - ucAddAttachment.rx, ucAddAttachment.cy - 10);
drawAssociation(actors.student.x + 30, actors.student.y + 20, ucSearchKB.cx - ucSearchKB.rx, ucSearchKB.cy);
drawAssociation(actors.student.x + 30, actors.student.y + 25, ucNotifications.cx - ucNotifications.rx, ucNotifications.cy);

// Staff
drawAssociation(actors.staff.x + 30, actors.staff.y - 15, ucLogin.cx - ucLogin.rx, ucLogin.cy + 10);
drawAssociation(actors.staff.x + 30, actors.staff.y - 5,  ucViewQueue.cx - ucViewQueue.rx, ucViewQueue.cy);
drawAssociation(actors.staff.x + 30, actors.staff.y,      ucClaimTicket.cx - ucClaimTicket.rx, ucClaimTicket.cy);
drawAssociation(actors.staff.x + 30, actors.staff.y + 5,  ucUpdateStatus.cx - ucUpdateStatus.rx, ucUpdateStatus.cy);
drawAssociation(actors.staff.x + 30, actors.staff.y + 10, ucCreateTicket.cx - ucCreateTicket.rx, ucCreateTicket.cy + 10);
drawAssociation(actors.staff.x + 30, actors.staff.y + 20, ucAskAssistant.cx - ucAskAssistant.rx, ucAskAssistant.cy);

// Admin
drawAssociation(actors.admin.x - 30, actors.admin.y - 10, ucLogin.cx + ucLogin.rx, ucLogin.cy);
drawAssociation(actors.admin.x - 30, actors.admin.y - 5,  ucProvision.cx + ucProvision.rx, ucProvision.cy);
drawAssociation(actors.admin.x - 30, actors.admin.y,      ucCreateApiKey.cx + ucCreateApiKey.rx, ucCreateApiKey.cy);
drawAssociation(actors.admin.x - 30, actors.admin.y + 5,  ucCreateFaq.cx + ucCreateFaq.rx, ucCreateFaq.cy);
drawAssociation(actors.admin.x - 30, actors.admin.y + 10, ucUploadDoc.cx + ucUploadDoc.rx, ucUploadDoc.cy);
drawAssociation(actors.admin.x - 30, actors.admin.y + 15, ucViewTraces.cx + ucViewTraces.rx, ucViewTraces.cy);
drawAssociation(actors.admin.x - 30, actors.admin.y + 20, ucViewQueue.cx + ucViewQueue.rx, ucViewQueue.cy);

// External system
drawAssociation(actors.external.x - 30, actors.external.y,     ucPubSearch.cx + ucPubSearch.rx, ucPubSearch.cy);
drawAssociation(actors.external.x - 30, actors.external.y + 10, ucPubTicket.cx + ucPubTicket.rx, ucPubTicket.cy);

// Gemini AI
drawAssociation(actors.ai.x - 30, actors.ai.y, ucKnowledgeAI.cx + ucKnowledgeAI.rx, ucKnowledgeAI.cy);

// ── DEPENDENCIES (<<include>> / <<extend>>) ──────────────────────────
drawDependency(ucCreateTicket, ucAddAttachment, '«include»', C.includeColor);
drawDependency(ucAskAssistant, ucKnowledgeAI, '«include»', C.includeColor);
drawDependency(ucAskAssistant, ucWorkflowAI, '«include»', C.includeColor);
drawDependency(ucWorkflowAI, ucCreateTicket, '«extend»', C.extendColor);
drawDependency(ucKnowledgeAI, ucSearchKB, '«include»', C.includeColor);
drawDependency(ucPubTicket, ucCreateTicket, '«include»', C.includeColor);
drawDependency(ucPubSearch, ucSearchKB, '«include»', C.includeColor);

// ── LEGEND ───────────────────────────────────────────────────────────
const legX = 55, legY = H - 90;
doc.save();
doc.roundedRect(legX, legY, 350, 60, 6).lineWidth(1).fillAndStroke('#FFFFFF', '#CBD5E1');
doc.restore();
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.actorLabel);
doc.text('Legend', legX + 10, legY + 6);

// association line
drawLine(legX + 15, legY + 24, legX + 55, legY + 24, C.lineColor, false);
doc.font('Helvetica').fontSize(7.5).fillColor(C.sectionLabel);
doc.text('Association', legX + 60, legY + 20);

// include line
drawLine(legX + 15, legY + 38, legX + 55, legY + 38, C.includeColor, true);
doc.font('Helvetica').fontSize(7.5).fillColor(C.includeColor);
doc.text('«include»', legX + 60, legY + 34);

// extend line
drawLine(legX + 150, legY + 24, legX + 190, legY + 24, C.extendColor, true);
doc.font('Helvetica').fontSize(7.5).fillColor(C.extendColor);
doc.text('«extend»', legX + 195, legY + 20);

// actor
drawStickFigure(legX + 170, legY + 37, C.actorColor);
doc.font('Helvetica').fontSize(7.5).fillColor(C.sectionLabel);
doc.text('Actor', legX + 185, legY + 44);

// use case
drawEllipse(legX + 285, legY + 30, 35, 13, C.ellipseFill, C.ellipseStroke, 1);
doc.font('Helvetica').fontSize(7.5).fillColor(C.sectionLabel);
doc.text('Use Case', legX + 257, legY + 26, { width: 56, align: 'center' });

// ── FOOTER ───────────────────────────────────────────────────────────
doc.font('Helvetica').fontSize(7.5).fillColor(C.footerText);
doc.text(
  `College Support Platform  •  UML Use-Case Diagram  •  Generated ${new Date().toISOString().slice(0, 10)}  •  Actors: Student, Staff, Admin, External System, Gemini AI`,
  50,
  H - 25,
  { width: W, align: 'center' },
);

doc.end();
console.log(`✔  PDF saved to ${outPath}`);
