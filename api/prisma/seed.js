/* eslint-disable no-console */
const { PrismaClient, Role, TicketStatus } = require('@prisma/client');
const argon2 = require('argon2');

async function seedAdmin() {
  const prisma = new PrismaClient();

  const schoolId = process.env.BOOTSTRAP_ADMIN_SCHOOL_ID || '00000001';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin1234!';
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME || 'System Admin';
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || null;

  try {
    const existing = await prisma.user.findUnique({
      where: { schoolId },
      select: { id: true },
    });

    if (existing) {
      console.log(`[seed] Admin ${schoolId} already exists.`);
    } else {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

      await prisma.user.create({
        data: {
          schoolId,
          email,
          passwordHash,
          role: Role.ADMIN,
          supportArea: null,
          academicDepartment: null,
          profile: {
            create: {
              fullName,
            },
          },
        },
      });

      console.log(`[seed] Admin created. schoolId=${schoolId}`);
    }

    await prisma.user.updateMany({
      where: { role: Role.ADMIN },
      data: {
        supportArea: null,
        academicDepartment: null,
      },
    });

    const ticketsToBackfill = await prisma.ticket.findMany({
      where: {
        academicDepartment: null,
      },
      select: {
        id: true,
        student: {
          select: {
            academicDepartment: true,
          },
        },
      },
    });

    for (const ticket of ticketsToBackfill) {
      if (!ticket.student.academicDepartment) {
        continue;
      }

      await prisma.ticket.update({
        where: {
          id: ticket.id,
        },
        data: {
          academicDepartment: ticket.student.academicDepartment,
        },
      });
    }

    const studentsToSync = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        academicDepartment: {
          not: null,
        },
      },
      select: {
        id: true,
        academicDepartment: true,
      },
    });

    for (const student of studentsToSync) {
      await prisma.ticket.updateMany({
        where: {
          studentId: student.id,
          academicDepartment: null,
          status: {
            not: TicketStatus.RESOLVED,
          },
        },
        data: {
          academicDepartment: student.academicDepartment,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('[seed] Failed to seed admin:', error);
  process.exit(1);
});
