import express from 'express';
import path from 'path';
import cors from 'cors';
import { google } from 'googleapis';
import cookieSession from 'cookie-session';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'checkhome-secret';

const getOAuth2Client = (redirectUri?: string) => {
  return new google.auth.OAuth2(
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

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const dailyTasksBase = [
  { title: 'Hacer la cama y ventilar', assignee: 'Ambos', room: 'Dormitorio principal' },
  { title: 'Recoger encimeras y lavavajillas', assignee: 'Ambos', room: 'Cocina' },
  { title: 'Repaso rápido de mesas y cojines', assignee: 'Ambos', room: 'Salón' },
];

const generatedDailyTasks = daysOfWeek.flatMap(day => 
  dailyTasksBase.map((task, index) => ({
    id: `daily-${day.toLowerCase()}-${index}`,
    title: task.title,
    assignee: task.assignee,
    room: task.room,
    day: day,
    isCompleted: 0
  }))
);

const initialTasks = [
  ...generatedDailyTasks,
  { id: 'l1', title: 'Limpieza a fondo de encimeras y electrodomésticos', assignee: 'Laura', room: 'Cocina', day: 'Lunes', isCompleted: 0 },
  { id: 'l2', title: 'Limpiar polvo, ordenar mesa y aspirar', assignee: 'Laura', room: 'Despacho Laura', day: 'Lunes', isCompleted: 0 },
  { id: 'l3', title: 'Limpiar polvo, ordenar mesa y aspirar', assignee: 'Christian', room: 'Oficina Chris', day: 'Lunes', isCompleted: 0 },
  { id: 'l4', title: 'Limpieza de sanitarios, lavabo y espejo', assignee: 'Christian', room: 'Aseo', day: 'Lunes', isCompleted: 0 },
  { id: 'm1', title: 'Limpieza profunda (ducha, sanitarios, espejos)', assignee: 'Laura', room: 'Baño Lau', day: 'Martes', isCompleted: 0 },
  { id: 'm2', title: 'Limpieza profunda (ducha, sanitarios, espejos)', assignee: 'Christian', room: 'Baño Chris', day: 'Martes', isCompleted: 0 },
  { id: 'm3', title: 'Aspirar y fregar suelo', assignee: 'Laura', room: 'Dormitorio principal', day: 'Martes', isCompleted: 0 },
  { id: 'm4', title: 'Ordenar ropa, limpiar polvo y aspirar', assignee: 'Christian', room: 'Vestidor', day: 'Martes', isCompleted: 0 },
  { id: 'x1', title: 'Poner lavadoras, tender y doblar', assignee: 'Laura', room: 'Cuarto limpieza', day: 'Miércoles', isCompleted: 0 },
  { id: 'x2', title: 'Limpiar cristales y quitar polvo a fondo', assignee: 'Christian', room: 'Salón', day: 'Miércoles', isCompleted: 0 },
  { id: 'x3', title: 'Aspirar y fregar suelo', assignee: 'Laura', room: 'Pasillo (P+1)', day: 'Miércoles', isCompleted: 0 },
  { id: 'x4', title: 'Aspirar y fregar peldaños', assignee: 'Christian', room: 'Escaleras interiores', day: 'Miércoles', isCompleted: 0 },
  { id: 'j1', title: 'Barrer y limpiar mobiliario exterior', assignee: 'Laura', room: 'Porche delantero', day: 'Jueves', isCompleted: 0 },
  { id: 'j2', title: 'Barrer y limpiar mobiliario exterior', assignee: 'Christian', room: 'Porche trasero', day: 'Jueves', isCompleted: 0 },
  { id: 'j3', title: 'Aspirar y fregar suelo a fondo', assignee: 'Laura', room: 'Cocina', day: 'Jueves', isCompleted: 0 },
  { id: 'j4', title: 'Aspirar y fregar suelo a fondo', assignee: 'Christian', room: 'Salón', day: 'Jueves', isCompleted: 0 },
  { id: 'v1', title: 'Revisar caducidades, limpiar nevera y despensa', assignee: 'Laura', room: 'Cocina', day: 'Viernes', isCompleted: 0 },
  { id: 'v2', title: 'Barrer, regar plantas y ordenar', assignee: 'Christian', room: 'Patio', day: 'Viernes', isCompleted: 0 },
  { id: 'v3', title: 'Limpiar y organizar productos', assignee: 'Ambos', room: 'Cuarto limpieza', day: 'Viernes', isCompleted: 0 },
  { id: 'v4', title: 'Aspirar y fregar suelo', assignee: 'Ambos', room: 'Recibidor/pasillo', day: 'Viernes', isCompleted: 0 },
  { id: 's1', title: 'Barrer y organizar herramientas/cajas', assignee: 'Christian', room: 'Garaje', day: 'Sábado', isCompleted: 0 },
  { id: 's2', title: 'Barrer o limpiar con manguera', assignee: 'Christian', room: 'Rampa garaje', day: 'Sábado', isCompleted: 0 },
  { id: 's3', title: 'Organizar cajas y limpiar polvo', assignee: 'Laura', room: 'Trastero', day: 'Sábado', isCompleted: 0 },
  { id: 's4', title: 'Mantenimiento general de plantas', assignee: 'Laura', room: 'Patio', day: 'Sábado', isCompleted: 0 },
  { id: 'd5', title: 'Preparar menú semanal (Batch cooking)', assignee: 'Laura', room: 'Cocina', day: 'Domingo', isCompleted: 0 },
  { id: 'd6', title: 'Sacar basuras y organizar reciclaje', assignee: 'Christian', room: 'Cuarto limpieza', day: 'Domingo', isCompleted: 0 },
  { id: 'd7', title: 'Cambiar sábanas', assignee: 'Ambos', room: 'Dormitorio principal', day: 'Domingo', isCompleted: 0 },
];

const initialLongTermTasks = [
  { id: 'lt1', title: 'Limpieza de filtros de aire acondicionado', assignee: 'Ambos', date: '2026-05-15', isCompleted: false },
  { id: 'lt2', title: 'Limpieza profunda de horno', assignee: 'Laura', date: '2026-04-10', isCompleted: false },
  { id: 'lt3', title: 'Revisión y limpieza de canalones', assignee: 'Christian', date: '2026-10-01', isCompleted: false },
  { id: 'lt4', title: 'Limpieza de cortinas y estores', assignee: 'Ambos', date: '2026-06-20', isCompleted: false },
];

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
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
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
