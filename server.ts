import express from 'express';
import path from 'path';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import cookieSession from 'cookie-session';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initialTasks, initialLongTermTasks } from './src/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'checkhome-secret';

const getOAuth2Client = (redirectUri?: string) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing Google OAuth credentials');
  }
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

const getRedirectUri = (req: express.Request) => {
  const xForwardedHost = req.get('x-forwarded-host');
  const host = xForwardedHost || req.get('host') || 'localhost:3000';
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  
  if (host.includes('localhost')) {
    // If we have APP_URL, use it as the base for the redirect URI
    if (process.env.APP_URL) {
      const uri = `${process.env.APP_URL}/auth/callback`;
      console.log('Generated Redirect URI (from APP_URL):', uri);
      return uri;
    }
    return `http://localhost:3000/auth/callback`;
  }
  
  const uri = `${protocol}://${host}/auth/callback`;
  console.log('Generated Redirect URI (final):', uri, 'Protocol:', protocol);
  return uri;
};

const DRIVE_FILE_NAME = 'checkhome_data.json';

export const app = express();
app.set('trust proxy', true);
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV, 
    vercel: !!process.env.VERCEL,
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET
  });
});

app.use(cookieSession({
  name: 'session',
  keys: [COOKIE_SECRET],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: true,
  sameSite: 'none'
}));

// Helper to get Drive client
async function getDriveClient(tokens: any) {
  const { google } = await import('googleapis');
  const auth = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials(tokens);
  return google.drive({ version: 'v3', auth });
}

// Helper to find or create the data file in Drive
async function getOrCreateDriveFile(drive: any) {
  const response = await drive.files.list({
    q: `name = '${DRIVE_FILE_NAME}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  let fileId = response.data.files?.[0]?.id;

  if (!fileId) {
    const initialData = {
      tasks: initialTasks.map(t => ({ ...t, isCompleted: !!t.isCompleted })),
      longTermTasks: initialLongTermTasks
    };

    const fileMetadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
    };
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(initialData),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    fileId = file.data.id;
  }

  return fileId;
}

// Helper to load data from Drive
async function loadDataFromDrive(drive: any, fileId: string) {
  const response = await drive.files.get({
    fileId: fileId,
    alt: 'media',
  });
  return response.data;
}

// Helper to save data to Drive
async function saveDataToDrive(drive: any, fileId: string, data: any) {
  await drive.files.update({
    fileId: fileId,
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(data),
    },
  });
}

// Auth Routes
app.get('/api/auth/google/url', (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials in environment variables');
      return res.status(500).json({ 
        error: 'Missing Google OAuth credentials',
        details: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.'
      });
    }
    const redirectUri = getRedirectUri(req);
    const oauth2Client = getOAuth2Client(redirectUri);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file', 'openid', 'profile', 'email'],
      prompt: 'consent',
      redirect_uri: redirectUri
    });
    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const redirectUri = getRedirectUri(req);
  const oauth2Client = getOAuth2Client(redirectUri);
  console.log('OAuth Callback - Code received');
  try {
    const { tokens } = await oauth2Client.getToken({
      code: code as string,
      redirect_uri: redirectUri
    });
    console.log('OAuth Callback - Tokens obtained');
    req.session!.tokens = tokens;
    
    // Initialize file in Drive if it doesn't exist
    try {
      const drive = await getDriveClient(tokens);
      await getOrCreateDriveFile(drive);
      console.log('OAuth Callback - Drive file initialized');
    } catch (driveError) {
      console.error('Error initializing Drive file in callback:', driveError);
      // We still continue as the tokens are saved
    }

    res.send(`
      <html>
        <body>
          <script>
            console.log('Popup: Sending OAUTH_AUTH_SUCCESS message');
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              setTimeout(() => {
                console.log('Popup: Closing window');
                window.close();
              }, 1000);
            } else {
              console.log('Popup: No opener found, redirecting to /');
              window.location.href = '/';
            }
          </script>
          <p>Autenticación completada. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', (req, res) => {
  console.log('API Auth Me - Session tokens exists:', !!req.session?.tokens);
  if (req.session?.tokens) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

app.get('/api/debug/headers', (req, res) => {
  res.json({
    headers: req.headers,
    protocol: req.protocol,
    host: req.get('host'),
    redirectUri: getRedirectUri(req)
  });
});

// Middleware to ensure authenticated and get Drive data
const withDriveData = async (req: any, res: any, next: any) => {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const drive = await getDriveClient(req.session.tokens);
    const fileId = await getOrCreateDriveFile(drive);
    const data = await loadDataFromDrive(drive, fileId);
    req.drive = drive;
    req.fileId = fileId;
    req.driveData = data;
    next();
  } catch (error) {
    console.error('Drive error:', error);
    res.status(500).json({ error: 'Failed to access Google Drive' });
  }
};

// API Routes
app.get('/api/tasks', withDriveData, (req: any, res) => {
  res.json(req.driveData.tasks);
});

app.post('/api/tasks', withDriveData, async (req: any, res) => {
  const task = req.body;
  req.driveData.tasks.push(task);
  await saveDataToDrive(req.drive, req.fileId, req.driveData);
  res.status(201).json({ success: true });
});

app.put('/api/tasks/:id', withDriveData, async (req: any, res) => {
  const { id } = req.params;
  const updatedTask = req.body;
  req.driveData.tasks = req.driveData.tasks.map((t: any) => t.id === id ? updatedTask : t);
  await saveDataToDrive(req.drive, req.fileId, req.driveData);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', withDriveData, async (req: any, res) => {
  const { id } = req.params;
  req.driveData.tasks = req.driveData.tasks.filter((t: any) => t.id !== id);
  await saveDataToDrive(req.drive, req.fileId, req.driveData);
  res.json({ success: true });
});

app.get('/api/long-term-tasks', withDriveData, (req: any, res) => {
  res.json(req.driveData.longTermTasks);
});

app.post('/api/long-term-tasks', withDriveData, async (req: any, res) => {
  const task = req.body;
  req.driveData.longTermTasks.push(task);
  await saveDataToDrive(req.drive, req.fileId, req.driveData);
  res.status(201).json({ success: true });
});

app.put('/api/long-term-tasks/:id', withDriveData, async (req: any, res) => {
  const { id } = req.params;
  const updatedTask = req.body;
  req.driveData.longTermTasks = req.driveData.longTermTasks.map((t: any) => t.id === id ? updatedTask : t);
  await saveDataToDrive(req.drive, req.fileId, req.driveData);
  res.json({ success: true });
});

app.delete('/api/long-term-tasks/:id', withDriveData, async (req: any, res) => {
  const { id } = req.params;
  req.driveData.longTermTasks = req.driveData.longTermTasks.filter((t: any) => t.id !== id);
  await saveDataToDrive(req.drive, req.fileId, req.driveData);
  res.json({ success: true });
});

// Only start the server if not running as a Vercel function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startServer();
}
