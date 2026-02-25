/* eslint-disable no-console */
const { PrismaClient, Role, Department } = require('@prisma/client');
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
      return;
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    await prisma.user.create({
      data: {
        schoolId,
        email,
        passwordHash,
        role: Role.ADMIN,
        department: Department.REGISTRATION,
        profile: {
          create: {
            fullName,
          },
        },
      },
    });

    console.log(`[seed] Admin created. schoolId=${schoolId}`);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('[seed] Failed to seed admin:', error);
  process.exit(1);
});
