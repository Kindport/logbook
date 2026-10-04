import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), './data/pglite');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new PGlite(dataDir);

export async function initDatabase() {
  // Initialize relational tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      matric_no TEXT NOT NULL,
      institution TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS placements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      host_organization TEXT NOT NULL,
      start_date TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      date_range TEXT NOT NULL,
      raw_notes TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_week UNIQUE (user_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS entry_days (
      id SERIAL PRIMARY KEY,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      day_name TEXT NOT NULL,
      text TEXT NOT NULL
    );
  `);
  console.log('PostgreSQL database initialized successfully with all tables.');
}
