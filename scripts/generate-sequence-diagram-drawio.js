#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'docs', 'sequence-diagram.drawio');

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

function participant(id, label, x) {
  const cells = [];
  cells.push(
    vertex(
      `${id}-head`,
      label,
      x - 60,
      40,
      120,
      42,
      'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#2563EB;fontColor=#111827;fontStyle=1;fontSize=12;',
    ),
  );
  cells.push(
    edge(
      `${id}-lifeline`,
      '',
      x,
      82,
      x,
      1620,
      'edgeStyle=none;rounded=0;html=1;strokeColor=#94A3B8;dashed=1;dashPattern=4 4;endArrow=none;',
    ),
  );
  return cells;
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

function frame(id, type, condition, x, y, w, h) {
  return [
    vertex(
      `${id}-box`,
      '',
      x,
      y,
      w,
      h,
      'rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;dashed=0;',
    ),
    vertex(
      `${id}-tag`,
      type,
      x,
      y,
      52,
      24,
      'rounded=0;whiteSpace=wrap;html=1;fillColor=#E2E8F0;strokeColor=#64748B;fontStyle=1;fontSize=11;align=center;',
    ),
    vertex(
      `${id}-cond`,
      condition,
      x + 70,
      y + 2,
      220,
      20,
      'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=11;fontColor=#334155;',
    ),
  ];
}

const xs = {
  student: 90,
  web: 310,
  api: 560,
  orchestrator: 800,
  knowledge: 1040,
  workflow: 1280,
  db: 1520,
};

const cells = [
  vertex(
    'title',
    'College Support Portal - Sequence Diagram',
    520,
    10,
    460,
    24,
    'text;html=1;strokeColor=none;fillColor=none;align=center;fontStyle=1;fontSize=18;fontColor=#111827;',
  ),
  ...participant('student', 'Student', xs.student),
  ...participant('web', 'Web App', xs.web),
  ...participant('api', 'Backend API', xs.api),
  ...participant('orchestrator', 'Orchestrator', xs.orchestrator),
  ...participant('knowledge', 'Knowledge Agent', xs.knowledge),
  ...participant('workflow', 'Workflow Agent', xs.workflow),
  ...participant('db', 'Database', xs.db),

  activation('api-auth-register', xs.api, 150, 130),
  activation('db-register', xs.db, 190, 50),
  activation('api-auth-login', xs.api, 370, 130),
  activation('db-login', xs.db, 410, 50),
  activation('api-assistant', xs.api, 750, 540),
  activation('orchestrator-active', xs.orchestrator, 790, 70),
  activation('knowledge-active', xs.knowledge, 880, 160),
  activation('workflow-active', xs.workflow, 1090, 130),
  activation('db-search', xs.db, 920, 50),
  activation('db-ticket-create', xs.db, 1130, 50),
  activation('api-track', xs.api, 1420, 140),
  activation('db-track', xs.db, 1460, 50),

  message('m1', '1. Register', xs.student, 130, xs.web),
  message('m2', '2. POST /auth/register-student', xs.web, 170, xs.api),
  message('m3', '3. Create user + profile', xs.api, 210, xs.db),
  message('m4', '4. accessToken', xs.db, 250, xs.api, true),
  message('m5', '5. Registration success', xs.api, 290, xs.web, true),

  message('m6', '6. Login', xs.student, 330, xs.web),
  message('m7', '7. POST /auth/login', xs.web, 370, xs.api),
  message('m8', '8. Verify credentials', xs.api, 410, xs.db),
  message('m9', '9. User found', xs.db, 450, xs.api, true),
  message('m10', '10. JWT token', xs.api, 490, xs.web, true),

  ...frame('auth-ok', 'alt', '[Authentication Success]', 40, 530, 1560, 90),
  message('m11', '11. Dashboard shown', xs.web, 575, xs.student, true),

  ...frame('loop-main', 'loop', '[Until logout]', 30, 640, 1580, 980),

  ...frame('ask-assistant', 'alt', '[Ask assistant]', 50, 690, 1540, 620),
  message('m12', '12. Ask question', xs.student, 740, xs.web),
  message('m13', '13. POST /assistant/message', xs.web, 780, xs.api),
  message('m14', '14. Classify intent + department', xs.api, 820, xs.orchestrator),
  message('m15', '15. KNOWLEDGE / MIXED', xs.orchestrator, 860, xs.api, true),
  message('m16', '16. Request trusted answer', xs.api, 900, xs.knowledge),
  message('m17', '17. Search FAQ/docs/chunks', xs.knowledge, 940, xs.db),
  message('m18', '18. Relevant context', xs.db, 980, xs.knowledge, true),
  message('m19', '19. Answer + confidence', xs.knowledge, 1020, xs.api, true),

  ...frame('low-confidence', 'alt', '[Low confidence / missing context]', 500, 1060, 1060, 200),
  message('m20', '20. Escalate to workflow', xs.api, 1110, xs.workflow),
  message('m21', '21. Create ticket', xs.workflow, 1150, xs.db),
  message('m22', '22. Ticket ID', xs.db, 1190, xs.workflow, true),
  message('m23', '23. Escalation result', xs.workflow, 1230, xs.api, true),

  message('m24', '24. JSON response', xs.api, 1270, xs.web, true),
  message('m25', '25. Show answer / ticket created', xs.web, 1305, xs.student, true),

  ...frame('track-status', 'alt', '[Track request status]', 50, 1335, 1540, 250),
  message('m26', '26. Open dashboard / My tickets', xs.student, 1385, xs.web),
  message('m27', '27. GET /tickets/my', xs.web, 1425, xs.api),
  message('m28', '28. Fetch ticket data', xs.api, 1465, xs.db),
  message('m29', '29. Tickets + statuses', xs.db, 1505, xs.api, true),
  message('m30', '30. JSON response', xs.api, 1545, xs.web, true),
  message('m31', '31. Show ticket status', xs.web, 1585, xs.student, true),

  vertex(
    'legend',
    'This sequence diagram follows the real project flow: auth, assistant routing, ticket escalation, and ticket tracking.',
    1060,
    1640,
    500,
    24,
    'text;html=1;strokeColor=none;fillColor=none;align=right;fontSize=10;fontColor=#64748B;',
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-04-04T00:00:00.000Z" agent="Codex" version="24.7.17" editor="www.draw.io" compressed="false">
  <diagram id="sequence-diagram-page" name="Sequence Diagram">
    <mxGraphModel dx="1800" dy="1800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1700" pageHeight="1750" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${cells.join('')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Generated ${path.relative(process.cwd(), outPath)}`);
