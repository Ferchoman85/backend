"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-integra-trade-2026';
// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { email },
            include: {
                merchandiser: true
            }
        });
        if (!user || user.isActive === false || user.isActive === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                merchandiserId: user.merchandiser?.id || null
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
    }
});
// PASSWORD RECOVERY REQUEST
router.post('/recovery', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email requerido' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            // Don't leak user existence in production, but for testing we can return success
            return res.json({ message: 'Si el correo existe en el sistema, se ha enviado un enlace de recuperación' });
        }
        // In a real application, we would generate a token and send it via email
        // Here we will simulate it and return the email for validation
        res.json({
            message: 'Si el correo existe en el sistema, se ha enviado un enlace de recuperación',
            // We return the reset token info for dev simulation
            devResetLink: `/api/auth/reset-password?email=${encodeURIComponent(email)}`
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al procesar la recuperación' });
    }
});
// PASSWORD RESET
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email y nueva contraseña requeridos' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await db_1.default.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Contraseña actualizada exitosamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
});
exports.default = router;
