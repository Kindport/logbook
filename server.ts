import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from './src/server/db.ts';
import { generateLogbookEntry } from './src/server/ai.ts';
import { generateLogbookPdf } from './src/server/pdf.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'logbook-siwes-secret-key-2026';

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  matric_no: string;
  institution: string;
  department: string;
}

// Auth Middleware
function requireAuth(req: express.Request & { user?: AuthenticatedUser }, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }
}

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(express.json());

  // --- AUTH ROUTES ---

  // POST /api/auth/signup
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password, matric_no, institution, department } = req.body;

      if (!name || !email || !password || !matric_no || !institution || !department) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      const emailClean = email.trim().toLowerCase();
      // Check if user already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [emailClean]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const insertResult = await db.query(
        `INSERT INTO users (name, email, password_hash, matric_no, institution, department)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, matric_no, institution, department, created_at`,
        [name.trim(), emailClean, passwordHash, matric_no.trim(), institution.trim(), department.trim()]
      );

      const user = insertResult.rows[0] as AuthenticatedUser;
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          matric_no: user.matric_no,
          institution: user.institution,
          department: user.department,
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(201).json({
        token,
        user,
        placement: null,
      });
    } catch (err: any) {
      console.error('Signup error:', err);
      return res.status(500).json({ error: 'Failed to create account.' });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const emailClean = email.trim().toLowerCase();
      const userResult = await db.query(
        'SELECT id, name, email, password_hash, matric_no, institution, department FROM users WHERE email = $1',
        [emailClean]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const userRow = userResult.rows[0] as any;
      const isValid = await bcrypt.compare(password, userRow.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check placement
      const placementResult = await db.query(
        'SELECT id, host_organization, start_date, duration_weeks FROM placements WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [userRow.id]
      );
      const placement = placementResult.rows[0] || null;

      const user: AuthenticatedUser = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        matric_no: userRow.matric_no,
        institution: userRow.institution,
        department: userRow.department,
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        token,
        user,
        placement,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Failed to log in.' });
    }
  });

  // POST /api/auth/demo (Instant 1-Click Exploration)
  app.post('/api/auth/demo', async (_req, res) => {
    try {
      const demoEmail = 'amina.bello@unilag.edu.ng';
      let userRow: any;
      const userRes = await db.query('SELECT * FROM users WHERE email = $1', [demoEmail]);

      if (userRes.rows.length === 0) {
        const hash = await bcrypt.hash('demo12345', 10);
        const ins = await db.query(
          `INSERT INTO users (name, email, password_hash, matric_no, institution, department)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, email, matric_no, institution, department`,
          [
            'Amina Bello',
            demoEmail,
            hash,
            '190408022',
            'University of Lagos (UNILAG)',
            'Computer Science & Engineering',
          ]
        );
        userRow = ins.rows[0];

        // Create sample placement
        await db.query(
          `INSERT INTO placements (user_id, host_organization, start_date, duration_weeks)
           VALUES ($1, $2, $3, $4)`,
          [userRow.id, 'Flutterwave HQ, Ikoyi Lagos', '2026-08-03', 24]
        );

        // Preload sample realistic SIWES reports
        const sampleWeeks = [
          {
            week: 1,
            range: '3 Aug – 9 Aug 2026',
            notes: 'Orientation on company engineering guidelines. Git workflow and Docker environment setup. Assigned to infrastructure squad.',
            summary: 'Underwent corporate workplace orientation and IT infrastructure induction. Set up local development environment with Docker containers and participated in weekly sprint planning.',
            days: [
              { day: 'Monday', text: 'Attended engineering team onboarding and reviewed information security protocols.' },
              { day: 'Tuesday', text: 'Configured local development workspace, installed Docker CLI, and verified repository access.' },
              { day: 'Wednesday', text: 'Attended backend team standup and reviewed Jira sprint backlog for infrastructure tickets.' },
              { day: 'Thursday', text: 'Assisted senior engineer with staging server database backup verification scripts.' },
              { day: 'Friday', text: 'Participated in retrospective meeting and documented week 1 onboarding checklist.' },
            ],
          },
          {
            week: 2,
            range: '10 Aug – 16 Aug 2026',
            notes: 'Diagnosed slow SQL queries on transaction analytics table. Added composite index. Monitored query execution plan.',
            summary: 'Analyzed database performance bottlenecks on PostgreSQL analytics tables. Assisted in creating targeted composite indexes that reduced query latency by 45%.',
            days: [
              { day: 'Monday', text: 'Reviewed slow query log files and identified unindexed sequential scans on customer transaction tables.' },
              { day: 'Tuesday', text: 'Tested execution plans with EXPLAIN ANALYZE on test database instance.' },
              { day: 'Wednesday', text: 'Implemented composite index and monitored cache hit ratios alongside database administrator.' },
              { day: 'Thursday', text: 'Benchmarked throughput under simulated concurrent read traffic using siege utility.' },
              { day: 'Friday', text: 'Compiled technical summary of index optimization results for tech lead sign-off.' },
            ],
          },
          {
            week: 3,
            range: '17 Aug – 23 Aug 2026',
            notes: 'Configured Nginx reverse proxy SSL certificates. Tested automated renewal cron job. Inspected access logs.',
            summary: 'Handled server administration tasks relating to Nginx reverse proxy SSL/TLS certificate installation and renewal automation. Maintained log monitoring routines.',
            days: [
              { day: 'Monday', text: 'Assisted in deploying Let\'s Encrypt SSL/TLS certificates on staging load balancer.' },
              { day: 'Tuesday', text: 'Configured Nginx server blocks to enforce HTTPS redirection and HSTS security headers.' },
              { day: 'Wednesday', text: 'Created cron job script to test certbot automatic certificate renewal verification.' },
              { day: 'Thursday', text: 'Audited Nginx access and error logs for 4xx/5xx anomalies during deployment window.' },
              { day: 'Friday', text: 'Delivered weekly system status report to systems engineering team supervisor.' },
            ],
          },
        ];

        for (const sw of sampleWeeks) {
          const eRes = await db.query(
            `INSERT INTO entries (user_id, week_number, date_range, raw_notes, summary)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [userRow.id, sw.week, sw.range, sw.notes, sw.summary]
          );
          const entryId = (eRes.rows[0] as any).id;
          for (const d of sw.days) {
            await db.query(
              `INSERT INTO entry_days (entry_id, day_name, text) VALUES ($1, $2, $3)`,
              [entryId, d.day, d.text]
            );
          }
        }
      } else {
        userRow = userRes.rows[0];
      }

      const pRes = await db.query(
        'SELECT id, host_organization, start_date, duration_weeks FROM placements WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [userRow.id]
      );

      const user: AuthenticatedUser = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        matric_no: userRow.matric_no,
        institution: userRow.institution,
        department: userRow.department,
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        token,
        user,
        placement: pRes.rows[0] || null,
      });
    } catch (err: any) {
      console.error('Demo auth error:', err);
      return res.status(500).json({ error: 'Failed to launch demo account.' });
    }
  });

  // GET /api/auth/me
  app.get('/api/auth/me', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userResult = await db.query(
        'SELECT id, name, email, matric_no, institution, department FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const placementResult = await db.query(
        'SELECT id, host_organization, start_date, duration_weeks FROM placements WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [userId]
      );

      return res.json({
        user: userResult.rows[0],
        placement: placementResult.rows[0] || null,
      });
    } catch (err: any) {
      console.error('Auth me error:', err);
      return res.status(500).json({ error: 'Failed to verify session.' });
    }
  });

  // --- PLACEMENT ONBOARDING ROUTES ---

  // POST /api/placements
  app.post('/api/placements', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { host_organization, start_date, duration_weeks } = req.body;

      if (!host_organization || !start_date || !duration_weeks) {
        return res.status(400).json({ error: 'Host organisation, start date, and duration are required.' });
      }

      const durationNum = parseInt(duration_weeks, 10);
      if (isNaN(durationNum) || durationNum <= 0) {
        return res.status(400).json({ error: 'Duration must be a positive integer.' });
      }

      // Check if placement already exists, if so update, else insert
      const existing = await db.query('SELECT id FROM placements WHERE user_id = $1', [userId]);

      let placementRow;
      if (existing.rows.length > 0) {
        const updateResult = await db.query(
          `UPDATE placements
           SET host_organization = $1, start_date = $2, duration_weeks = $3
           WHERE user_id = $4
           RETURNING id, host_organization, start_date, duration_weeks`,
          [host_organization.trim(), start_date, durationNum, userId]
        );
        placementRow = updateResult.rows[0];
      } else {
        const insertResult = await db.query(
          `INSERT INTO placements (user_id, host_organization, start_date, duration_weeks)
           VALUES ($1, $2, $3, $4)
           RETURNING id, host_organization, start_date, duration_weeks`,
          [userId, host_organization.trim(), start_date, durationNum]
        );
        placementRow = insertResult.rows[0];
      }

      return res.status(200).json({ placement: placementRow });
    } catch (err: any) {
      console.error('Save placement error:', err);
      return res.status(500).json({ error: 'Failed to save placement record.' });
    }
  });

  // GET /api/placements
  app.get('/api/placements', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await db.query(
        'SELECT id, host_organization, start_date, duration_weeks FROM placements WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [userId]
      );
      return res.json({ placement: result.rows[0] || null });
    } catch (err: any) {
      console.error('Get placement error:', err);
      return res.status(500).json({ error: 'Failed to fetch placement.' });
    }
  });

  // --- ENTRIES ROUTES ---

  // GET /api/entries
  app.get('/api/entries', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entriesResult = await db.query(
        `SELECT id, week_number, date_range, raw_notes, summary, created_at, updated_at
         FROM entries
         WHERE user_id = $1
         ORDER BY week_number ASC`,
        [userId]
      );

      const entries = entriesResult.rows as any[];
      if (entries.length === 0) {
        return res.json({ entries: [] });
      }

      // Fetch days for all these entries
      const entryIds = entries.map((e) => e.id);
      const daysResult = await db.query(
        `SELECT id, entry_id, day_name, text
         FROM entry_days
         WHERE entry_id = ANY($1::int[])
         ORDER BY id ASC`,
        [entryIds]
      );

      const daysByEntryId = new Map<number, any[]>();
      for (const d of daysResult.rows as any[]) {
        if (!daysByEntryId.has(d.entry_id)) {
          daysByEntryId.set(d.entry_id, []);
        }
        daysByEntryId.get(d.entry_id)!.push({
          id: d.id,
          day_name: d.day_name,
          text: d.text,
        });
      }

      const populatedEntries = entries.map((e) => ({
        ...e,
        days: daysByEntryId.get(e.id) || [],
      }));

      return res.json({ entries: populatedEntries });
    } catch (err: any) {
      console.error('Fetch entries error:', err);
      return res.status(500).json({ error: 'Failed to retrieve entries.' });
    }
  });

  // GET /api/entries/export
  app.get('/api/entries/export', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Fetch user and placement info
      const userRes = await db.query(
        'SELECT name, email, matric_no, institution, department FROM users WHERE id = $1',
        [userId]
      );
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
      const user = userRes.rows[0] as any;

      const placementRes = await db.query(
        'SELECT host_organization, start_date, duration_weeks FROM placements WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [userId]
      );
      const placement = (placementRes.rows[0] as any) || {
        host_organization: 'N/A',
        start_date: 'N/A',
        duration_weeks: 0,
      };

      // Fetch all entries
      const entriesRes = await db.query(
        `SELECT id, week_number, date_range, raw_notes, summary
         FROM entries
         WHERE user_id = $1
         ORDER BY week_number ASC`,
        [userId]
      );
      const entries = entriesRes.rows as any[];

      // Fetch days
      if (entries.length > 0) {
        const entryIds = entries.map((e) => e.id);
        const daysRes = await db.query(
          `SELECT entry_id, day_name, text FROM entry_days WHERE entry_id = ANY($1::int[]) ORDER BY id ASC`,
          [entryIds]
        );

        const daysMap = new Map<number, any[]>();
        for (const d of daysRes.rows as any[]) {
          if (!daysMap.has(d.entry_id)) daysMap.set(d.entry_id, []);
          daysMap.get(d.entry_id)!.push({ day_name: d.day_name, text: d.text });
        }

        for (const e of entries) {
          e.days = daysMap.get(e.id) || [];
        }
      }

      const pdfBytes = await generateLogbookPdf(
        {
          name: user.name,
          matric_no: user.matric_no,
          institution: user.institution,
          department: user.department,
          host_organization: placement.host_organization,
          start_date: placement.start_date,
          duration_weeks: placement.duration_weeks,
        },
        entries
      );

      const filename = `SIWES_LogBook_${user.matric_no.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBytes.length);
      return res.send(Buffer.from(pdfBytes));
    } catch (err: any) {
      console.error('Export PDF error:', err);
      return res.status(500).json({ error: 'Failed to generate logbook PDF export.' });
    }
  });

  // GET /api/entries/:weekNumber
  app.get('/api/entries/:weekNumber', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const weekNumber = parseInt(req.params.weekNumber, 10);
      if (isNaN(weekNumber)) {
        return res.status(400).json({ error: 'Invalid week number.' });
      }

      const entryResult = await db.query(
        `SELECT id, week_number, date_range, raw_notes, summary, created_at, updated_at
         FROM entries
         WHERE user_id = $1 AND week_number = $2`,
        [userId, weekNumber]
      );

      if (entryResult.rows.length === 0) {
        return res.json({ entry: null });
      }

      const entry = entryResult.rows[0] as any;
      const daysResult = await db.query(
        `SELECT id, day_name, text FROM entry_days WHERE entry_id = $1 ORDER BY id ASC`,
        [entry.id]
      );

      return res.json({
        entry: {
          ...entry,
          days: daysResult.rows,
        },
      });
    } catch (err: any) {
      console.error('Fetch week entry error:', err);
      return res.status(500).json({ error: 'Failed to retrieve week entry.' });
    }
  });

  // DELETE /api/entries/:weekNumber
  app.delete('/api/entries/:weekNumber', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const weekNumber = parseInt(req.params.weekNumber, 10);
      if (isNaN(weekNumber)) {
        return res.status(400).json({ error: 'Invalid week number.' });
      }

      await db.query(
        'DELETE FROM entries WHERE user_id = $1 AND week_number = $2',
        [userId, weekNumber]
      );

      return res.json({ success: true, weekNumber });
    } catch (err: any) {
      console.error('Delete entry error:', err);
      return res.status(500).json({ error: 'Failed to delete entry.' });
    }
  });

  // POST /api/entries (Upsert)
  app.post('/api/entries', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const week_number = req.body.week_number ?? req.body.weekNumber;
      const date_range = req.body.date_range ?? req.body.dateRange;
      const raw_notes = req.body.raw_notes ?? req.body.rawNotes ?? '';
      const summary = req.body.summary ?? '';
      const days = req.body.days ?? [];

      if (!week_number || !date_range) {
        return res.status(400).json({ error: 'Missing week number or date range.' });
      }

      const weekNum = parseInt(week_number, 10);
      if (isNaN(weekNum) || weekNum <= 0) {
        return res.status(400).json({ error: 'Week number must be a positive integer.' });
      }

      // Upsert into entries
      const upsertEntryResult = await db.query(
        `INSERT INTO entries (user_id, week_number, date_range, raw_notes, summary, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, week_number)
         DO UPDATE SET
           date_range = EXCLUDED.date_range,
           raw_notes = EXCLUDED.raw_notes,
           summary = EXCLUDED.summary,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, week_number, date_range, raw_notes, summary, created_at, updated_at`,
        [userId, weekNum, date_range, raw_notes, summary]
      );

      const savedEntry = upsertEntryResult.rows[0] as any;
      const entryId = savedEntry.id;

      // Replace entry_days
      await db.query('DELETE FROM entry_days WHERE entry_id = $1', [entryId]);

      const savedDays: any[] = [];
      if (Array.isArray(days) && days.length > 0) {
        for (const d of days) {
          const insertDayResult = await db.query(
            `INSERT INTO entry_days (entry_id, day_name, text)
             VALUES ($1, $2, $3)
             RETURNING id, day_name, text`,
            [entryId, d.day_name || d.day, d.text || '']
          );
          savedDays.push(insertDayResult.rows[0]);
        }
      }

      return res.status(200).json({
        entry: {
          ...savedEntry,
          days: savedDays,
        },
      });
    } catch (err: any) {
      console.error('Save entry error:', err);
      return res.status(500).json({ error: 'Failed to persist logbook entry.' });
    }
  });

  // POST /api/entries/generate
  app.post('/api/entries/generate', requireAuth, async (req: any, res) => {
    try {
      const { weekNumber, dateRange, rawNotes } = req.body;

      if (!rawNotes || !rawNotes.trim()) {
        return res.status(400).json({ error: 'Raw notes cannot be empty for AI generation.' });
      }

      // Fetch user info for context
      const userId = req.user.id;
      const userRes = await db.query('SELECT department FROM users WHERE id = $1', [userId]);
      const placementRes = await db.query('SELECT host_organization FROM placements WHERE user_id = $1', [userId]);

      const department = (userRes.rows[0] as any)?.department;
      const hostOrganization = (placementRes.rows[0] as any)?.host_organization;

      const generated = await generateLogbookEntry({
        weekNumber: parseInt(weekNumber, 10) || 1,
        dateRange: dateRange || '',
        rawNotes,
        department,
        hostOrganization,
      });

      return res.json(generated);
    } catch (err: any) {
      console.error('AI generate error:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate logbook entry.' });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`LogBook server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
