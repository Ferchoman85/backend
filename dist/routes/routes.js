"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// LIST ALL ROUTES (Admin and Merchandiser)
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { merchandiserId } = req.query;
        const filter = {};
        if (merchandiserId) {
            filter.merchandiserId = merchandiserId;
        }
        const routes = await db_1.default.route.findMany({
            where: filter,
            include: {
                merchandiser: {
                    include: { user: true }
                },
                customers: {
                    include: { customer: true },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const result = routes.map(r => ({
            id: r.id,
            name: r.name,
            merchandiserId: r.merchandiserId,
            merchandiserName: r.merchandiser.user.name,
            customers: r.customers.map(rc => ({
                id: rc.customer.id,
                code: rc.customer.code,
                name: rc.customer.name,
                address: rc.customer.address,
                latitude: rc.customer.latitude,
                longitude: rc.customer.longitude,
                phone: rc.customer.phone,
                contact: rc.customer.contact,
                order: rc.order,
                visitDays: rc.visitDays.split(',')
            }))
        }));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener rutas' });
    }
});
// CREATE ROUTE WITH CUSTOMERS (Admin Only)
router.post('/', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { name, merchandiserId, customers } = req.body;
    // customers is an array of: { customerId: string, order: number, visitDays: string[] }
    if (!name || !merchandiserId || !customers || !Array.isArray(customers)) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o formato inválido' });
    }
    try {
        const result = await db_1.default.$transaction(async (tx) => {
            // 1. Create Route
            const route = await tx.route.create({
                data: {
                    name,
                    merchandiserId
                }
            });
            // 2. Create RouteCustomers
            const routeCustomersData = customers.map((c) => ({
                routeId: route.id,
                customerId: c.customerId,
                order: parseInt(c.order),
                visitDays: Array.isArray(c.visitDays) ? c.visitDays.join(',') : c.visitDays
            }));
            await tx.routeCustomer.createMany({
                data: routeCustomersData
            });
            return route;
        });
        res.status(201).json({
            message: 'Ruta creada y asignada exitosamente',
            routeId: result.id
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear la ruta' });
    }
});
// UPDATE ROUTE WITH CUSTOMERS (Admin Only)
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { name, merchandiserId, customers } = req.body;
    if (!name || !merchandiserId || !customers || !Array.isArray(customers)) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o formato inválido' });
    }
    try {
        await db_1.default.$transaction(async (tx) => {
            // 1. Update Route name and merchandiser
            await tx.route.update({
                where: { id },
                data: {
                    name,
                    merchandiserId
                }
            });
            // 2. Delete all existing RouteCustomers for this route
            await tx.routeCustomer.deleteMany({
                where: { routeId: id }
            });
            // 3. Re-create RouteCustomers
            const routeCustomersData = customers.map((c) => ({
                routeId: id,
                customerId: c.customerId,
                order: parseInt(c.order),
                visitDays: Array.isArray(c.visitDays) ? c.visitDays.join(',') : c.visitDays
            }));
            await tx.routeCustomer.createMany({
                data: routeCustomersData
            });
        });
        res.json({ message: 'Ruta actualizada exitosamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar la ruta' });
    }
});
// DELETE ROUTE (Admin Only)
router.delete('/:id', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.default.route.delete({
            where: { id }
        });
        res.json({ message: 'Ruta eliminada exitosamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al eliminar la ruta' });
    }
});
exports.default = router;
