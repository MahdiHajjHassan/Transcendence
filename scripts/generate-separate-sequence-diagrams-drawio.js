#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'docs', 'sequence-diagrams');
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
      520,
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

writeDiagram('sequence-register-student.drawio', {
  title: 'Sequence Diagram - Student Registration',
  pageHeight: 700,
  participants: [
    { id: 'student', label: 'Student', x: 110 },
    { id: 'web', label: 'Web App', x: 360 },
    { id: 'auth', label: 'Auth API', x: 650 },
    { id: 'db', label: 'Database', x: 970 },
  ],
  activations: [
    { id: 'auth-act', x: 650, y: 180, h: 210 },
    { id: 'db-check', x: 970, y: 220, h: 60 },
    { id: 'db-create', x: 970, y: 300, h: 60 },
  ],
  messages: [
    { id: 'm1', label: '1. Fill registration form', x1: 110, y: 150, x2: 360 },
    { id: 'm2', label: '2. POST /auth/register-student', x1: 360, y: 190, x2: 650 },
    { id: 'm3', label: '3. Find user by schoolId', x1: 650, y: 230, x2: 970 },
    { id: 'm4', label: '4. No existing student', x1: 970, y: 270, x2: 650, dashed: true },
    { id: 'm5', label: '5. Create User + Profile', x1: 650, y: 310, x2: 970 },
    { id: 'm6', label: '6. User created', x1: 970, y: 350, x2: 650, dashed: true },
    { id: 'm7', label: '7. accessToken', x1: 650, y: 390, x2: 360, dashed: true },
    { id: 'm8', label: '8. Redirect to dashboard', x1: 360, y: 430, x2: 110, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'The backend automatically sets role = STUDENT and creates the Profile.',
      x: 700,
      y: 470,
      w: 300,
      h: 70,
    },
  ],
});

writeDiagram('sequence-login.drawio', {
  title: 'Sequence Diagram - Student Login',
  pageHeight: 680,
  participants: [
    { id: 'student', label: 'Student', x: 110 },
    { id: 'web', label: 'Web App', x: 360 },
    { id: 'auth', label: 'Auth API', x: 650 },
    { id: 'db', label: 'Database', x: 970 },
  ],
  activations: [
    { id: 'auth-act', x: 650, y: 180, h: 190 },
    { id: 'db-find', x: 970, y: 220, h: 60 },
  ],
  messages: [
    { id: 'm1', label: '1. Enter schoolId + password', x1: 110, y: 150, x2: 360 },
    { id: 'm2', label: '2. POST /auth/login', x1: 360, y: 190, x2: 650 },
    { id: 'm3', label: '3. Find user by schoolId', x1: 650, y: 230, x2: 970 },
    { id: 'm4', label: '4. User data', x1: 970, y: 270, x2: 650, dashed: true },
    { id: 'm5', label: '5. Verify password + active user', x1: 650, y: 310, x2: 650 },
    { id: 'm6', label: '6. accessToken', x1: 650, y: 350, x2: 360, dashed: true },
    { id: 'm7', label: '7. Login successful', x1: 360, y: 390, x2: 110, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'If credentials are invalid, the API returns Unauthorized instead of a token.',
      x: 690,
      y: 430,
      w: 300,
      h: 70,
    },
  ],
});

writeDiagram('sequence-assistant-answer.drawio', {
  title: 'Sequence Diagram - Assistant Answers a Question',
  pageHeight: 840,
  participants: [
    { id: 'student', label: 'Student', x: 80 },
    { id: 'web', label: 'Web App', x: 260 },
    { id: 'api', label: 'Assistant API', x: 470 },
    { id: 'orchestrator', label: 'Orchestrator', x: 680 },
    { id: 'knowledge', label: 'Knowledge Agent', x: 910 },
    { id: 'db', label: 'Database', x: 1140 },
  ],
  activations: [
    { id: 'api-act', x: 470, y: 180, h: 360 },
    { id: 'orch-act', x: 680, y: 220, h: 70 },
    { id: 'know-act', x: 910, y: 300, h: 160 },
    { id: 'db-act', x: 1140, y: 340, h: 70 },
  ],
  messages: [
    { id: 'm1', label: '1. Ask question', x1: 80, y: 150, x2: 260 },
    { id: 'm2', label: '2. POST /assistant/message', x1: 260, y: 190, x2: 470 },
    { id: 'm3', label: '3. classifyIntent()', x1: 470, y: 230, x2: 680 },
    { id: 'm4', label: '4. KNOWLEDGE / department', x1: 680, y: 270, x2: 470, dashed: true },
    { id: 'm5', label: '5. answer(question, department)', x1: 470, y: 310, x2: 910 },
    { id: 'm6', label: '6. retrieveRelevant()', x1: 910, y: 350, x2: 1140 },
    { id: 'm7', label: '7. FAQ/docs/chunks', x1: 1140, y: 390, x2: 910, dashed: true },
    { id: 'm8', label: '8. grounded answer + confidence', x1: 910, y: 430, x2: 470, dashed: true },
    { id: 'm9', label: '9. JSON response', x1: 470, y: 490, x2: 260, dashed: true },
    { id: 'm10', label: '10. Show final answer', x1: 260, y: 530, x2: 80, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'This diagram is for the successful knowledge-answer path only.',
      x: 760,
      y: 580,
      w: 320,
      h: 60,
    },
  ],
});

writeDiagram('sequence-ticket-creation.drawio', {
  title: 'Sequence Diagram - Student Creates a Ticket',
  pageHeight: 780,
  participants: [
    { id: 'student', label: 'Student', x: 100 },
    { id: 'web', label: 'Web App', x: 330 },
    { id: 'tickets', label: 'Tickets API', x: 610 },
    { id: 'db', label: 'Database', x: 910 },
    { id: 'staff', label: 'Staff', x: 1170 },
  ],
  activations: [
    { id: 'ticket-act', x: 610, y: 180, h: 260 },
    { id: 'db-create', x: 910, y: 220, h: 70 },
    { id: 'db-find', x: 910, y: 320, h: 70 },
  ],
  messages: [
    { id: 'm1', label: '1. Fill support request', x1: 100, y: 150, x2: 330 },
    { id: 'm2', label: '2. POST /tickets', x1: 330, y: 190, x2: 610 },
    { id: 'm3', label: '3. Create ticket + CREATED event', x1: 610, y: 230, x2: 910 },
    { id: 'm4', label: '4. Ticket created', x1: 910, y: 270, x2: 610, dashed: true },
    { id: 'm5', label: '5. Find staff in department', x1: 610, y: 330, x2: 910 },
    { id: 'm6', label: '6. Staff list', x1: 910, y: 370, x2: 610, dashed: true },
    { id: 'm7', label: '7. Notify department staff', x1: 610, y: 410, x2: 1170 },
    { id: 'm8', label: '8. Ticket confirmation', x1: 610, y: 450, x2: 330, dashed: true },
    { id: 'm9', label: '9. Show submitted ticket', x1: 330, y: 490, x2: 100, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'The service also creates notifications and may send emails to matching staff members.',
      x: 740,
      y: 540,
      w: 360,
      h: 70,
    },
  ],
});

writeDiagram('sequence-ticket-status.drawio', {
  title: 'Sequence Diagram - Student Tracks Ticket Status',
  pageHeight: 700,
  participants: [
    { id: 'student', label: 'Student', x: 110 },
    { id: 'web', label: 'Web App', x: 360 },
    { id: 'tickets', label: 'Tickets API', x: 650 },
    { id: 'db', label: 'Database', x: 970 },
  ],
  activations: [
    { id: 'api-act', x: 650, y: 180, h: 160 },
    { id: 'db-act', x: 970, y: 220, h: 60 },
  ],
  messages: [
    { id: 'm1', label: '1. Open My Tickets', x1: 110, y: 150, x2: 360 },
    { id: 'm2', label: '2. GET /tickets/my', x1: 360, y: 190, x2: 650 },
    { id: 'm3', label: '3. Query student tickets', x1: 650, y: 230, x2: 970 },
    { id: 'm4', label: '4. Ticket list + statuses', x1: 970, y: 270, x2: 650, dashed: true },
    { id: 'm5', label: '5. JSON response', x1: 650, y: 310, x2: 360, dashed: true },
    { id: 'm6', label: '6. Show status timeline', x1: 360, y: 350, x2: 110, dashed: true },
  ],
  notes: [
    {
      id: 'n1',
      text: 'The same API can also return ticket details, attachments, and recent events.',
      x: 650,
      y: 400,
      w: 320,
      h: 70,
    },
  ],
});

console.log('Generated separate sequence diagrams:');
for (const fileName of fs.readdirSync(outDir).filter((name) => name.endsWith('.drawio')).sort()) {
  console.log(`- docs/sequence-diagrams/${fileName}`);
}
