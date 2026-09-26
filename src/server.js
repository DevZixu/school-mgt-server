import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import app from './app.js';
import { store } from './data/store.js';

const { JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, PORT = 3000 } = process.env;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters long');
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  throw new Error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters are required');
}

const admin = {
  id: randomUUID(), name: 'Administrator', email: ADMIN_EMAIL.toLowerCase(), role: 'admin',
  passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12), createdAt: new Date().toISOString(),
};
store.users.set(admin.id, admin);

app.listen(Number(PORT), () => console.log(`School Management API listening on port ${PORT}`));