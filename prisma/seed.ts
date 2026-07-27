import 'dotenv/config';
import { randomBytes } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/utils/bcrypt.utilities';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
  { name: 'User Create', slug: 'user:create', description: 'Create new users' },
  { name: 'User Read', slug: 'user:read', description: 'View user details' },
  { name: 'User Update', slug: 'user:update', description: 'Update user details' },
  { name: 'User Delete', slug: 'user:delete', description: 'Delete users' },
  { name: 'Role Manage', slug: 'role:manage', description: 'Create, update, delete roles' },
  { name: 'Permission Manage', slug: 'permission:manage', description: 'Manage permissions' },
  { name: 'Audit Read', slug: 'audit:read', description: 'View audit logs' },
  { name: 'Audit Export', slug: 'audit:export', description: 'Export audit logs' },
  { name: 'Embassy Create', slug: 'embassy:create', description: 'Create embassies' },
  { name: 'Embassy Read', slug: 'embassy:read', description: 'View embassy details' },
  { name: 'Embassy Update', slug: 'embassy:update', description: 'Update embassies' },
  { name: 'Embassy Delete', slug: 'embassy:delete', description: 'Delete embassies' },
  { name: 'Department Create', slug: 'department:create', description: 'Create departments' },
  { name: 'Department Read', slug: 'department:read', description: 'View departments' },
  { name: 'Department Update', slug: 'department:update', description: 'Update departments' },
  { name: 'Department Delete', slug: 'department:delete', description: 'Delete departments' },
  { name: 'Service Type Create', slug: 'service-type:create', description: 'Create service types' },
  { name: 'Service Type Read', slug: 'service-type:read', description: 'View service types' },
  { name: 'Service Type Update', slug: 'service-type:update', description: 'Update service types' },
  { name: 'Service Type Delete', slug: 'service-type:delete', description: 'Delete service types' },
  { name: 'Service Request Create', slug: 'service-request:create', description: 'Submit service requests' },
  { name: 'Service Request Read', slug: 'service-request:read', description: 'View service requests' },
  { name: 'Service Request Update', slug: 'service-request:update', description: 'Update service request status' },
  { name: 'Service Request Read All', slug: 'service-request:read-all', description: 'View all service requests' },
  { name: 'Visa Create', slug: 'visa:create', description: 'Submit visa applications' },
  { name: 'Visa Read', slug: 'visa:read', description: 'View visa applications' },
  { name: 'Visa Update', slug: 'visa:update', description: 'Update visa applications' },
  { name: 'Appointment Create', slug: 'appointment:create', description: 'Book appointments' },
  { name: 'Appointment Read', slug: 'appointment:read', description: 'View appointments' },
  { name: 'Appointment Update', slug: 'appointment:update', description: 'Manage appointments' },
  { name: 'Profile Create', slug: 'profile:create', description: 'Create user profile' },
  { name: 'Profile Read', slug: 'profile:read', description: 'View user profiles' },
  { name: 'Profile Update', slug: 'profile:update', description: 'Update user profile' },
  { name: 'Visa Decision Create', slug: 'visa-decision:create', description: 'Make visa decisions' },
  { name: 'Visa Decision Read', slug: 'visa-decision:read', description: 'View visa decisions' },
  { name: 'Vetting Create', slug: 'vetting:create', description: 'Run vetting checks' },
  { name: 'Vetting Read', slug: 'vetting:read', description: 'View vetting results' },
  { name: 'Appointment Manage', slug: 'appointment:manage', description: 'Manage appointment queue' },
];

const ROLES = [
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Full system access',
    permissions: PERMISSIONS.map((p) => p.slug),
  },
  {
    name: 'Officer',
    slug: 'officer',
    description: 'Consular officer with elevated access',
    permissions: [
      'user:read', 'embassy:read', 'department:read',
      'service-type:read', 'service-request:read', 'service-request:update', 'service-request:read-all',
      'visa:read', 'visa:update', 'visa-decision:create', 'visa-decision:read',
      'vetting:create', 'vetting:read',
      'appointment:read', 'appointment:update', 'appointment:manage',
      'audit:read', 'profile:read',
    ],
  },
  {
    name: 'Consular Staff',
    slug: 'consular_staff',
    description: 'Front desk and processing staff',
    permissions: [
      'user:read', 'embassy:read', 'department:read',
      'service-type:read', 'service-request:create', 'service-request:read',
      'visa:create', 'visa:read', 'visa-decision:read', 'vetting:read',
      'appointment:create', 'appointment:read',
    ],
  },
  {
    name: 'Viewer',
    slug: 'viewer',
    description: 'Read-only access',
    permissions: [
      'user:read', 'embassy:read', 'department:read',
      'service-type:read', 'service-request:read', 'visa:read', 'visa-decision:read',
      'appointment:read', 'audit:read', 'profile:read',
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  const existingPermissions = await prisma.permission.findMany();
  const existingPermissionsMap = new Map(existingPermissions.map((p) => [p.slug, p.id]));

  for (const perm of PERMISSIONS) {
    if (!existingPermissionsMap.has(perm.slug)) {
      await prisma.permission.create({ data: perm });
      console.log(`  Created permission: ${perm.slug}`);
    } else {
      console.log(`  Permission already exists: ${perm.slug}`);
    }
  }

  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.slug, p.id]));

  for (const roleData of ROLES) {
    let role = await prisma.role.findUnique({ where: { slug: roleData.slug } });

    if (!role) {
      role = await prisma.role.create({
        data: { name: roleData.name, slug: roleData.slug, description: roleData.description },
      });
      console.log(`  Created role: ${roleData.slug}`);
    } else {
      console.log(`  Role already exists: ${roleData.slug}`);
    }

    const permissionIds = roleData.permissions
      .map((slug) => permMap.get(slug))
      .filter((id): id is string => !!id);

    const existingAssignments = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
    });
    const existingPermissionIds = existingAssignments.map((a) => a.permissionId);

    const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.includes(id));

    if (newPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: newPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
      console.log(`  Assigned ${newPermissionIds.length} permissions to ${roleData.slug}`);
    }
  }

  const adminEmail = 'admin@embassy.gov';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminRole = await prisma.role.findUnique({ where: { slug: 'admin' } });
    const tempPassword = randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.create({
      data: {
        firstName: 'System',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
        roleId: adminRole?.id,
      },
    });
    console.log(`  Created admin user: admin@embassy.gov`);
    console.log(`  ⚠ Admin initial password: ${tempPassword} (change on first login)`);
  } else {
    console.log('  Admin user already exists');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });