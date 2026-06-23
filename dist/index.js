"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const users_1 = __importDefault(require("./routes/users"));
const customers_1 = __importDefault(require("./routes/customers"));
const articles_1 = __importDefault(require("./routes/articles"));
const routes_1 = __importDefault(require("./routes/routes"));
const visits_1 = __importDefault(require("./routes/visits"));
const reports_1 = __importDefault(require("./routes/reports"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// CORS - Allow all origins (including null from file://)
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Ensure upload directory exists
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Serve uploaded photos statically
app.use('/uploads', express_1.default.static(uploadDir));
// Serve the admin panel from the /panel directory
const panelDir = path_1.default.join(__dirname, '../../panel');
if (fs_1.default.existsSync(panelDir)) {
    app.use('/panel', express_1.default.static(panelDir));
    console.log(`Admin panel available at http://localhost:${PORT}/panel`);
}
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/users', users_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/articles', articles_1.default);
app.use('/api/routes', routes_1.default);
app.use('/api/visits', visits_1.default);
app.use('/api/reports', reports_1.default);
// Root redirects to panel
app.get('/', (req, res) => {
    res.redirect('/panel');
});
app.listen(PORT, () => {
    console.log(`\n🚀 Integra Trade Backend running on http://localhost:${PORT}`);
    console.log(`📊 Panel Administrativo: http://localhost:${PORT}/panel\n`);
});
