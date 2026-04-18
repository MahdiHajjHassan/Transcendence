#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs', 'sequence-diagrams-admin-staff');
fs.mkdirSync(outDir, { recursive: true });

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function vertex(id, value, x, y, w, h, style) {
  return `
    <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
    </mxCell>`;
}

function edge(id, value, x1, y1, x2, y2, style) {
  return `
    <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" edge="1" parent="1">
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="${x1}" y="${y1}" as="sourcePoint" />
        <mxPoint x="${x2}" y="${y2}" as="targetPoint" />
      </mxGeometry>
    </mxCell>`;
}

function participant(id, label, x, bottomY) {
  return [
    vertex(
      `${id}-head`,
      label,
      x - 60,
      50,
      120,
      42,
      'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#2563EB;fontColor=#111827;fontStyle=1;fontSize=12;',
    ),
    edge(
      `${id}-lifeline`,
      '',
      x,
      92,
      x,
      bottomY,
      'edgeStyle=none;rounded=0;html=1;strokeColor=#94A3B8;dashed=1;dashPattern=4 4;endArrow=none;',
    ),
  ];
}

function activation(id, x, y, h) {
  return vertex(
    id,
    '',
    x - 6,
    y,
    12,
    h,
    'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#475569;',
  );
}

function message(id, label, x1, y, x2, dashed = false) {
  return edge(
    id,
    label,
    x1,
    y,
    x2,
    y,
    `edgeStyle=none;rounded=0;html=1;strokeColor=#111827;${dashed ? 'dashed=1;dashPattern=4 4;' : ''}endArrow=block;endFill=${dashed ? 0 : 1};fontSize=11;labelBackgroundColor=#FFFFFF;`,
  );
}

function note(id, text, x, y, w, h) {
  return vertex(
    id,
    text,
    x,
    y,
    w,
    h,
    'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FEF3C7;strokeColor=#D97706;fontColor=#111827;fontSize=11;',
  );
}

function buildDiagram({ title, pageHeight, participants, activations, messages, notes = [] }) {
  const bottomY = pageHeight - 80;
  const cells = [
    vertex(
      'title',
      title,
      360,
      10,
      560,
      24,
      'text;html=1;strokeColor=none;fillColor=none;align=center;fontStyle=1;fontSize=18;fontColor=#111827;',
    ),
    ...participants.flatMap((item) => participant(item.id, item.label, item.x, bottomY)),
    ...activations.map((item) => activation(item.id, item.x, item.y, item.h)),
    ...messages.map((item) =>
      message(item.id, item.label, item.x1, item.y, item.x2, item.dashed),
    ),
    ...notes.map((item) => note(item.id, item.text, item.x, item.y, item.w, item.h)),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-04-04T00:00:00.000Z" agent="Codex" version="24.7.17" editor="www.draw.io" compressed="false">
  <diagram id="page-1" name="${escapeXml(title)}">
    <mxGraphModel dx="1400" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1300" pageHeight="${pageHeight}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${cells.join('')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

function writeDiagram(fileName, spec) {
  fs.writeFileSync(path.join(outDir, fileName), buildDiagram(spec), 'utf8');
}

writeDiagram('admin-provision-user.drawio', {
  title: 'Sequence Diagram - Admin Provisions a User',
  pageHeight: 760,
  participants: [
    { id: 'admin', label: 'Admin', x: 110 },
    { id: 'web', label: 'Web App', x: 360 },
    { id: 'auth', label: 'Auth API', x: 650 },
    { id: 'db', label: 'Database', x: 980 },
  ],
  activations: [
    { id: 'auth-act', x: 650, y: 180, h: 220 },
    { id: 'db-act', x: 980, y: 230, h: 70 },
  ],
  messages: [
    { id: 'm1', label: '1. Fill staff/admin form', x1: 110, y: 150, x2: 360 },
    { id: 'm2', label: '2. POST /auth/admin/provision', x1: 360, y: 190, x2: 650 },
    { id: 'm3', label: '3. Hash password + prepare user', x1: 650, y: 230, x2: 650 },
    { id: 'm4', label: '4. Create User + Profile', x1: 650, y: 270, x2: 980 },
    { id: 'm5', label: '5. id + schoolId', x1: 980, y: 310, x2: 650, dashed: true },
    { id: 'm6', label: '6. Provision result', x1: 650, y: 350, x2: 360, dashed: true },
    { id: 'm7', label: '7. Show created account', x1: 360, y: 390, x2: 110, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'Only ADMIN can call this endpoint. The created user can be STAFF or ADMIN.',
      x: 700,
      y: 450,
      w: 310,
      h: 70,
    },
  ],
});

writeDiagram('admin-create-api-key.drawio', {
  title: 'Sequence Diagram - Admin Creates an API Key',
  pageHeight: 760,
  participants: [
    { id: 'admin', label: 'Admin', x: 110 },
    { id: 'web', label: 'Web App', x: 360 },
    { id: 'adminApi', label: 'Admin API', x: 650 },
    { id: 'db', label: 'Database', x: 980 },
  ],
  activations: [
    { id: 'api-act', x: 650, y: 180, h: 220 },
    { id: 'db-act', x: 980, y: 270, h: 70 },
  ],
  messages: [
    { id: 'm1', label: '1. Enter label + scopes', x1: 110, y: 150, x2: 360 },
    { id: 'm2', label: '2. POST /admin/api-keys', x1: 360, y: 190, x2: 650 },
    { id: 'm3', label: '3. Generate plain key + hashed key', x1: 650, y: 240, x2: 650 },
    { id: 'm4', label: '4. Store hashed key', x1: 650, y: 280, x2: 980 },
    { id: 'm5', label: '5. Saved key metadata', x1: 980, y: 320, x2: 650, dashed: true },
    { id: 'm6', label: '6. Return key once', x1: 650, y: 360, x2: 360, dashed: true },
    { id: 'm7', label: '7. Show/copy API key', x1: 360, y: 400, x2: 110, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'The real secret key is returned only once. The database keeps only hashedKey.',
      x: 690,
      y: 460,
      w: 320,
      h: 70,
    },
  ],
});

writeDiagram('admin-upload-knowledge-document.drawio', {
  title: 'Sequence Diagram - Admin Uploads a Knowledge Document',
  pageHeight: 860,
  participants: [
    { id: 'admin', label: 'Admin', x: 90 },
    { id: 'web', label: 'Web App', x: 300 },
    { id: 'knowledgeApi', label: 'Knowledge API', x: 560 },
    { id: 'gemini', label: 'Gemini AI', x: 850 },
    { id: 'db', label: 'Database', x: 1130 },
  ],
  activations: [
    { id: 'api-act', x: 560, y: 180, h: 330 },
    { id: 'db-doc', x: 1130, y: 250, h: 60 },
    { id: 'ai-act', x: 850, y: 350, h: 110 },
    { id: 'db-chunks', x: 1130, y: 440, h: 60 },
  ],
  messages: [
    { id: 'm1', label: '1. Select file/content', x1: 90, y: 150, x2: 300 },
    { id: 'm2', label: '2. POST /admin/knowledge/documents', x1: 300, y: 190, x2: 560 },
    { id: 'm3', label: '3. Create KnowledgeDocument', x1: 560, y: 250, x2: 1130 },
    { id: 'm4', label: '4. document id', x1: 1130, y: 290, x2: 560, dashed: true },
    { id: 'm5', label: '5. Split content into chunks', x1: 560, y: 330, x2: 560 },
    { id: 'm6', label: '6. Embed each chunk', x1: 560, y: 370, x2: 850 },
    { id: 'm7', label: '7. Embeddings', x1: 850, y: 430, x2: 560, dashed: true },
    { id: 'm8', label: '8. createMany KnowledgeChunk', x1: 560, y: 450, x2: 1130 },
    { id: 'm9', label: '9. chunksCreated', x1: 1130, y: 490, x2: 560, dashed: true },
    { id: 'm10', label: '10. Upload result', x1: 560, y: 530, x2: 300, dashed: true },
    { id: 'm11', label: '11. Show success', x1: 300, y: 570, x2: 90, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'This is where KnowledgeChunk comes from: the document is split and each chunk gets an embedding.',
      x: 760,
      y: 630,
      w: 360,
      h: 80,
    },
  ],
});

writeDiagram('staff-claim-ticket.drawio', {
  title: 'Sequence Diagram - Staff Claims a Ticket',
  pageHeight: 780,
  participants: [
    { id: 'staff', label: 'Staff', x: 90 },
    { id: 'web', label: 'Web App', x: 320 },
    { id: 'ticketsApi', label: 'Tickets API', x: 610 },
    { id: 'db', label: 'Database', x: 930 },
    { id: 'student', label: 'Student', x: 1180 },
  ],
  activations: [
    { id: 'api-act', x: 610, y: 180, h: 250 },
    { id: 'db-read', x: 930, y: 230, h: 60 },
    { id: 'db-update', x: 930, y: 320, h: 60 },
  ],
  messages: [
    { id: 'm1', label: '1. Open queue item', x1: 90, y: 150, x2: 320 },
    { id: 'm2', label: '2. POST /tickets/:id/claim', x1: 320, y: 190, x2: 610 },
    { id: 'm3', label: '3. Get ticket by id', x1: 610, y: 230, x2: 930 },
    { id: 'm4', label: '4. Ticket data', x1: 930, y: 270, x2: 610, dashed: true },
    { id: 'm5', label: '5. Update assigneeId + status', x1: 610, y: 320, x2: 930 },
    { id: 'm6', label: '6. Updated ticket', x1: 930, y: 360, x2: 610, dashed: true },
    { id: 'm7', label: '7. Create notification', x1: 610, y: 400, x2: 930 },
    { id: 'm8', label: '8. Claim result', x1: 610, y: 440, x2: 320, dashed: true },
    { id: 'm9', label: '9. Queue shows IN_PROGRESS', x1: 320, y: 480, x2: 90, dashed: true },
    { id: 'm10', label: '10. Student notified', x1: 610, y: 520, x2: 1180, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'Only STAFF or ADMIN can claim tickets. Claiming sets status to IN_PROGRESS.',
      x: 670,
      y: 580,
      w: 330,
      h: 70,
    },
  ],
});

writeDiagram('staff-update-ticket-status.drawio', {
  title: 'Sequence Diagram - Staff Updates Ticket Status',
  pageHeight: 780,
  participants: [
    { id: 'staff', label: 'Staff', x: 90 },
    { id: 'web', label: 'Web App', x: 320 },
    { id: 'ticketsApi', label: 'Tickets API', x: 610 },
    { id: 'db', label: 'Database', x: 930 },
    { id: 'student', label: 'Student', x: 1180 },
  ],
  activations: [
    { id: 'api-act', x: 610, y: 180, h: 240 },
    { id: 'db-read', x: 930, y: 230, h: 60 },
    { id: 'db-update', x: 930, y: 320, h: 60 },
  ],
  messages: [
    { id: 'm1', label: '1. Choose new status', x1: 90, y: 150, x2: 320 },
    { id: 'm2', label: '2. PATCH /tickets/:id/status', x1: 320, y: 190, x2: 610 },
    { id: 'm3', label: '3. Get ticket by id', x1: 610, y: 230, x2: 930 },
    { id: 'm4', label: '4. Ticket data', x1: 930, y: 270, x2: 610, dashed: true },
    { id: 'm5', label: '5. Update status + create event', x1: 610, y: 320, x2: 930 },
    { id: 'm6', label: '6. Updated ticket', x1: 930, y: 360, x2: 610, dashed: true },
    { id: 'm7', label: '7. Notify student', x1: 610, y: 400, x2: 930 },
    { id: 'm8', label: '8. Status result', x1: 610, y: 440, x2: 320, dashed: true },
    { id: 'm9', label: '9. Show updated ticket', x1: 320, y: 480, x2: 90, dashed: true },
    { id: 'm10', label: '10. Student sees new status', x1: 610, y: 520, x2: 1180, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'This flow is used for values like OPEN, IN_PROGRESS, and RESOLVED.',
      x: 700,
      y: 580,
      w: 310,
      h: 70,
    },
  ],
});

console.log('Generated admin/staff sequence diagrams:');
for (const fileName of fs.readdirSync(outDir).filter((name) => name.endsWith('.drawio')).sort()) {
  console.log(`- docs/sequence-diagrams-admin-staff/${fileName}`);
}
