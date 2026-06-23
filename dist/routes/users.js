"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// LIST ALL USERS (Admin Only)
router.get('/', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const users = await db_1.default.user.findMany({
            include: {
                merchandiser: true
            },
            orderBy: { createdAt: 'desc' }
        });
        const formattedUsers = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            phone: user.merchandiser?.phone || '',
            merchandiserId: user.merchandiser?.id || null,
            createdAt: user.createdAt
        }));
        res.json(formattedUsers);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});
// LIST MERCHANDISERS ONLY (Admin Only)
router.get('/merchandisers', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const merchandisers = await db_1.default.merchandiser.findMany({
            include: {
                user: true
            }
        });
        const result = merchandisers.map(m => ({
            id: m.id,
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            phone: m.phone,
            isActive: m.user.isActive
        }));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener mercaderistas' });
    }
});
// CREATE USER (Admin Only)
router.post('/', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    try {
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const result = await db_1.default.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role
                }
            });
            if (role === 'MERCADERISTA') {
                const merchandiser = await tx.merchandiser.create({
                    data: {
                        userId: user.id,
                        phone: phone || ''
                    }
                });
                return { ...user, merchandiser };
            }
            return user;
        });
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: {
                id: result.id,
                name: result.name,
                email: result.email,
                role: result.role,
                isActive: result.isActive
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});
// UPDATE USER (Admin Only)
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { name, email, role, phone, isActive, password } = req.body;
    try {
        const user = await db_1.default.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
        if (role !== undefined)
            updateData.role = role;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 10);
        }
        const result = await db_1.default.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id },
                data: updateData,
                include: { merchandiser: true }
            });
            if (updatedUser.role === 'MERCADERISTA') {
                if (updatedUser.merchandiser) {
                    await tx.merchandiser.update({
                        where: { id: updatedUser.merchandiser.id },
                        data: { phone: phone || '' }
                    });
                }
                else {
                    await tx.merchandiser.create({
                        data: {
                            userId: updatedUser.id,
                            phone: phone || ''
                        }
                    });
                }
            }
            else if (updatedUser.role === 'ADMIN' && updatedUser.merchandiser) {
                // If role changed from mercaderista to admin, we delete the merchandiser entity
                await tx.merchandiser.delete({ where: { id: updatedUser.merchandiser.id } });
            }
            return updatedUser;
        });
        res.json({
            message: 'Usuario actualizado exitosamente',
            user: {
                id: result.id,
                name: result.name,
                email: result.email,
                role: result.role,
                isActive: result.isActive
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});
// TOGGLE USER STATE (Admin Only)
router.patch('/:id/toggle-state', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db_1.default.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const updatedUser = await db_1.default.user.update({
            where: { id },
            data: { isActive: !user.isActive }
        });
        res.json({
            message: `Usuario ${updatedUser.isActive ? 'activado' : 'inactivado'} exitosamente`,
            isActive: updatedUser.isActive
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado del usuario' });
    }
});
exports.default = router;
