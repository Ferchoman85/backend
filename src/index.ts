import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import articleRoutes from './routes/articles';
import routeRoutes from './routes/routes';
import visitRoutes from './routes/visits';
import reportRoutes from './routes/reports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Allow all origins (including null from file://)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded photos statically
app.use('/uploads', express.static(uploadDir));

// Serve the admin panel from the /panel directory
const panelDir = path.join(__dirname, '../../panel');
if (fs.existsSync(panelDir)) {
  app.use('/panel', express.static(panelDir));
  console.log(`Admin panel available at http://localhost:${PORT}/panel`);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reports', reportRoutes);

// Root redirects to panel
app.get('/', (req, res) => {
  res.redirect('/panel');
});

app.listen(PORT, () => {
  console.log(`\n🚀 Integra Trade Backend running on http://localhost:${PORT}`);
  console.log(`📊 Panel Administrativo: http://localhost:${PORT}/panel\n`);
});
