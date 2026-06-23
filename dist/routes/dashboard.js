"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// GET ADMIN DASHBOARD STATISTICS
router.get('/admin', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        // 1. Total active merchandisers
        const totalMerchandisers = await db_1.default.merchandiser.count({
            where: { user: { isActive: true } }
        });
        // 2. Total active customers
        const totalCustomers = await db_1.default.customer.count({
            where: { isActive: true }
        });
        // Determine current weekday name in Spanish for scheduling
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayIndex = new Date().getDay();
        const todayName = daysOfWeek[todayIndex];
        // 3. Planned visits today (Customers assigned to a route scheduled for today)
        const routeCustomers = await db_1.default.routeCustomer.findMany({
            include: {
                route: true
            }
        });
        // Filter local memory because database contains list string (comma separated)
        const scheduledTodayCustomers = routeCustomers.filter(rc => {
            const days = rc.visitDays.split(',');
            return days.includes(todayName);
        });
        const plannedVisitsCount = scheduledTodayCustomers.length;
        // 4. Completed visits today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const completedVisitsToday = await db_1.default.visit.count({
            where: {
                startTime: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            }
        });
        // 5. Compliance per Merchandiser (Visits today / Assigned routes today)
        const merchandisers = await db_1.default.merchandiser.findMany({
            include: { user: true }
        });
        const complianceList = [];
        for (const m of merchandisers) {
            // Find route customers for today assigned to this merchandiser
            const mRoutes = await db_1.default.route.findMany({
                where: { merchandiserId: m.id },
                include: { customers: true }
            });
            const mScheduledCustomers = mRoutes.flatMap(r => r.customers).filter(rc => {
                return rc.visitDays.split(',').includes(todayName);
            });
            const mPlannedCount = mScheduledCustomers.length;
            // Find visits completed by this merchandiser today
            const mCompletedCount = await db_1.default.visit.count({
                where: {
                    merchandiserId: m.id,
                    startTime: {
                        gte: startOfToday,
                        lte: endOfToday
                    }
                }
            });
            const complianceRate = mPlannedCount > 0
                ? Math.min(100, Math.round((mCompletedCount / mPlannedCount) * 100))
                : 100; // 100% compliance if nothing planned
            complianceList.push({
                merchandiserId: m.id,
                name: m.user.name,
                planned: mPlannedCount,
                completed: mCompletedCount,
                complianceRate
            });
        }
        res.json({
            totalMerchandisers,
            totalCustomers,
            plannedVisitsCount,
            completedVisitsToday,
            complianceList,
            weekday: todayName
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al cargar estadísticas del dashboard' });
    }
});
exports.default = router;
