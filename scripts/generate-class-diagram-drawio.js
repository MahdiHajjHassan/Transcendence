#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'docs', 'class-diagram.drawio');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function classHtml(title, attributes, methods) {
  const attrLines = attributes.map((line) => `${escapeXml(line)}<br/>`).join('');
  const methodLines = methods.map((line) => `${escapeXml(line)}<br/>`).join('');

  return [
    `<div style="text-align:center;font-size:14px;font-weight:700;">${escapeXml(title)}</div>`,
    '<hr/>',
    `<div style="line-height:1.45;">${attrLines}</div>`,
    '<hr/>',
    `<div style="line-height:1.45;">${methodLines}</div>`,
  ].join('');
}

function box(id, title, x, y, w, h, fill, stroke, attributes, methods) {
  return `
    <mxCell id="${id}" value="${escapeXml(classHtml(title, attributes, methods))}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingTop=8;spacingLeft=10;spacingRight=10;spacingBottom=8;fillColor=${fill};strokeColor=${stroke};fontColor=#111827;fontSize=11;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
    </mxCell>`;
}

function note(id, value, x, y, w, h) {
  return `
    <mxCell id="${id}" value="${escapeXml(value).replace(/\n/g, '&lt;br/&gt;')}" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FEF3C7;strokeColor=#D97706;fontColor=#111827;fontSize=11;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
    </mxCell>`;
}

function edge(id, source, target, value, style) {
  return `
    <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" edge="1" parent="1" source="${source}" target="${target}">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>`;
}

const classStyle = {
  inheritance:
    'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#475569;endArrow=block;endFill=0;endSize=18;',
  association:
    'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#475569;endArrow=classic;endFill=1;',
};

const boxes = [
  box(
    'profile',
    'Profile',
    40,
    40,
    280,
    190,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- fullName: String', '- avatarUrl: String?', '- userId: String', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ viewProfile()', '+ updateProfile()'],
  ),
  box(
    'user',
    'User',
    390,
    40,
    300,
    270,
    '#EFF6FF',
    '#1D4ED8',
    ['- id: String', '- schoolId: String', '- email: String?', '- passwordHash: String', '- role: Role', '- department: Department?', '- active: Boolean', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ login()', '+ viewProfile()', '+ updateProfile()'],
  ),
  box(
    'notification',
    'Notification',
    760,
    40,
    280,
    190,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- userId: String', '- type: NotificationType', '- title: String', '- message: String', '- read: Boolean', '- createdAt: DateTime'],
    ['+ createMany()', '+ getUnreadCount()'],
  ),
  box(
    'trace',
    'OrchestratorTrace',
    1110,
    40,
    320,
    220,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- userId: String', '- intent: String', '- confidence: Float?', '- routedAgents: Json', '- outcome: Json', '- createdAt: DateTime'],
    ['+ recordTrace()', '+ viewTraces()'],
  ),
  box(
    'student',
    'Student',
    40,
    330,
    280,
    220,
    '#FFFFFF',
    '#2563EB',
    ['- role: Role = STUDENT'],
    ['+ register()', '+ createTicket()', '+ viewMyTickets()', '+ updateOwnTicket()', '+ addAttachment()', '+ removeAttachment()', '+ getUnreadNotifications()'],
  ),
  box(
    'staff',
    'Staff',
    390,
    330,
    300,
    220,
    '#FFFFFF',
    '#2563EB',
    ['- role: Role = STAFF', '- department: Department'],
    ['+ listQueue()', '+ viewTicket()', '+ claimTicket()', '+ updateTicket()', '+ updateTicketStatus()', '+ addAttachment()', '+ removeAttachment()'],
  ),
  box(
    'admin',
    'Admin',
    760,
    330,
    280,
    240,
    '#FFFFFF',
    '#2563EB',
    ['- role: Role = ADMIN', '- department: Department?'],
    ['+ provisionUser()', '+ createApiKey()', '+ viewTraces()', '+ createFaq()', '+ uploadKnowledgeDocument()', '+ listQueue()', '+ claimTicket()', '+ updateTicketStatus()'],
  ),
  box(
    'apikey',
    'ApiKey',
    1110,
    330,
    320,
    200,
    '#FFFBEB',
    '#D97706',
    ['- id: String', '- label: String', '- hashedKey: String', '- scopes: String[]', '- rateLimitPolicy: Json?', '- active: Boolean', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createApiKey()', '+ deactivate()'],
  ),
  box(
    'knowledgeDocument',
    'KnowledgeDocument',
    40,
    640,
    320,
    240,
    '#ECFDF5',
    '#059669',
    ['- id: String', '- title: String', '- department: Department', '- sourceType: KnowledgeSourceType', '- content: String', '- status: String', '- uploadedBy: String', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createDocument()', '+ search()', '+ retrieveRelevant()'],
  ),
  box(
    'ticket',
    'Ticket',
    430,
    640,
    320,
    250,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- studentId: String', '- department: Department', '- subject: String', '- description: String', '- status: TicketStatus', '- assigneeId: String?', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createTicket()', '+ getTicketById()', '+ updateTicket()', '+ claimTicket()', '+ updateStatus()', '+ addAttachment()', '+ removeAttachment()'],
  ),
  box(
    'attachment',
    'Attachment',
    820,
    640,
    280,
    220,
    '#FFFFFF',
    '#64748B',
    ['- id: String', '- ticketId: String', '- uploaderId: String', '- fileName: String', '- mimeType: String', '- sizeBytes: Int', '- storagePath: String', '- createdAt: DateTime'],
    ['+ addAttachment()', '+ removeAttachment()', '+ validateAttachment()'],
  ),
  box(
    'ticketEvent',
    'TicketEvent',
    1170,
    640,
    260,
    200,
    '#FFFFFF',
    '#64748B',
    ['- id: String', '- ticketId: String', '- actorId: String', '- eventType: String', '- payload: Json?', '- createdAt: DateTime'],
    ['+ logEvent()'],
  ),
  box(
    'knowledgeChunk',
    'KnowledgeChunk',
    40,
    960,
    320,
    200,
    '#F0FDF4',
    '#059669',
    ['- id: String', '- documentId: String', '- chunkText: String', '- embedding: Float[]', '- chunkIndex: Int', '- createdAt: DateTime'],
    ['+ generateEmbedding()'],
  ),
  box(
    'faq',
    'FaqEntry',
    430,
    960,
    320,
    190,
    '#F0FDF4',
    '#059669',
    ['- id: String', '- department: Department', '- question: String', '- answer: String', '- tags: String[]', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createFaq()', '+ search()'],
  ),
  note(
    'note1',
    'Student, Staff, and Admin are role-based specializations of User.\nIn the real schema they are stored in the same User table.',
    780,
    930,
    310,
    120,
  ),
];

const edges = [
  edge('e1', 'student', 'user', '', classStyle.inheritance),
  edge('e2', 'staff', 'user', '', classStyle.inheritance),
  edge('e3', 'admin', 'user', '', classStyle.inheritance),
  edge('e4', 'user', 'profile', '1 has 0..1 profile', classStyle.association),
  edge('e5', 'user', 'notification', '1 receives 0..* notifications', classStyle.association),
  edge('e6', 'user', 'trace', '1 generates 0..* traces', classStyle.association),
  edge('e7', 'student', 'ticket', '1 creates 0..* tickets', classStyle.association),
  edge('e8', 'staff', 'ticket', 'handles / assigned tickets', classStyle.association),
  edge('e9', 'ticket', 'attachment', '1 has 0..* attachments', classStyle.association),
  edge('e10', 'ticket', 'ticketEvent', '1 logs 0..* events', classStyle.association),
  edge('e11', 'attachment', 'user', 'uploaded by user', classStyle.association),
  edge('e12', 'ticketEvent', 'user', 'actor user', classStyle.association),
  edge('e13', 'admin', 'apikey', 'creates API keys', classStyle.association),
  edge('e14', 'admin', 'knowledgeDocument', 'uploads / manages', classStyle.association),
  edge('e15', 'user', 'knowledgeDocument', 'uploads documents', classStyle.association),
  edge('e16', 'knowledgeDocument', 'knowledgeChunk', '1 split into 0..* chunks', classStyle.association),
  edge('e17', 'student', 'knowledgeDocument', 'searches', classStyle.association),
  edge('e18', 'admin', 'faq', 'manages FAQs', classStyle.association),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-04-04T00:00:00.000Z" agent="Codex" version="24.7.17" editor="www.draw.io" compressed="false">
  <diagram id="class-diagram-page" name="Class Diagram">
    <mxGraphModel dx="1720" dy="1250" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1700" pageHeight="1250" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${boxes.join('')}
        ${edges.join('')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Generated ${path.relative(process.cwd(), outPath)}`);
