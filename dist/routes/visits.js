"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Helper to save base64 string as image file
function saveBase64Image(base64Str, prefix) {
    // Clean base64 header if present (e.g. data:image/png;base64,)
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let dataBuffer;
    if (matches && matches.length === 3) {
        dataBuffer = Buffer.from(matches[2], 'base64');
    }
    else {
        dataBuffer = Buffer.from(base64Str, 'base64');
    }
    const filename = `${prefix}_${(0, uuid_1.v4)()}.png`;
    const uploadPath = path_1.default.join(__dirname, '../../uploads', filename);
    fs_1.default.writeFileSync(uploadPath, dataBuffer);
    return `/uploads/${filename}`;
}
// BULK SYNC ENDPOINT (Offline mode sync support)
router.post('/sync', auth_1.authenticateJWT, async (req, res) => {
    const { visits } = req.body; // Array of visits
    if (!visits || !Array.isArray(visits)) {
        return res.status(400).json({ error: 'Payload de sincronización inválido' });
    }
    const syncedIds = [];
    try {
        for (const v of visits) {
            // Destructure visit payload
            const { localId, // ID generated on mobile (we can use it or generate uuid)
            customerId, merchandiserId, startTime, endTime, startLatitude, startLongitude, endLatitude, endLongitude, observations, signatureBase64, inventories, // [{ articleId, stockQty, warehouseQty, observations }]
            prices, // [{ articleId, foundPrice, observations }]
            exhibition, // { productExhibited, productOutOfStock, popInstalled, competitorPresent }
            photos // [{ type: 'ANTES' | 'DESPUES', base64: string, latitude, longitude, takenAt }]
             } = v;
            // Skip if basic fields are missing
            if (!customerId || !merchandiserId || !startTime) {
                continue;
            }
            await db_1.default.$transaction(async (tx) => {
                // 1. Process Signature if provided
                let signatureUrl = null;
                if (signatureBase64) {
                    signatureUrl = saveBase64Image(signatureBase64, 'signature');
                }
                // 2. Create Visit
                const visit = await tx.visit.create({
                    data: {
                        customerId,
                        merchandiserId,
                        startTime: new Date(startTime),
                        endTime: endTime ? new Date(endTime) : null,
                        startLatitude: parseFloat(startLatitude),
                        startLongitude: parseFloat(startLongitude),
                        endLatitude: endLatitude ? parseFloat(endLatitude) : null,
                        endLongitude: endLongitude ? parseFloat(endLongitude) : null,
                        observations,
                        signatureUrl,
                        isSynced: true
                    }
                });
                // 3. Create Inventories
                if (inventories && Array.isArray(inventories)) {
                    const inventoryData = inventories.map((inv) => ({
                        visitId: visit.id,
                        articleId: inv.articleId,
                        stockQty: parseInt(inv.stockQty) || 0,
                        warehouseQty: parseInt(inv.warehouseQty) || 0,
                        observations: inv.observations || null
                    }));
                    await tx.inventory.createMany({ data: inventoryData });
                }
                // 4. Create Prices
                if (prices && Array.isArray(prices)) {
                    const priceData = prices.map((pr) => ({
                        visitId: visit.id,
                        articleId: pr.articleId,
                        foundPrice: parseFloat(pr.foundPrice) || 0.0,
                        observations: pr.observations || null
                    }));
                    await tx.price.createMany({ data: priceData });
                }
                // 5. Create Exhibition checklist
                if (exhibition) {
                    await tx.exhibition.create({
                        data: {
                            visitId: visit.id,
                            productExhibited: !!exhibition.productExhibited,
                            productOutOfStock: !!exhibition.productOutOfStock,
                            popInstalled: !!exhibition.popInstalled,
                            competitorPresent: !!exhibition.competitorPresent
                        }
                    });
                }
                // 6. Save and Create Photos
                if (photos && Array.isArray(photos)) {
                    for (const p of photos) {
                        if (p.base64) {
                            const photoUrl = saveBase64Image(p.base64, 'visit_photo');
                            await tx.visitPhoto.create({
                                data: {
                                    visitId: visit.id,
                                    type: p.type === 'ANTES' ? 'ANTES' : 'DESPUES',
                                    photoUrl,
                                    latitude: parseFloat(p.latitude) || parseFloat(startLatitude),
                                    longitude: parseFloat(p.longitude) || parseFloat(startLongitude),
                                    takenAt: p.takenAt ? new Date(p.takenAt) : new Date()
                                }
                            });
                        }
                    }
                }
            });
            syncedIds.push(localId);
        }
        res.json({
            message: 'Sincronización completada exitosamente',
            syncedLocalIds: syncedIds
        });
    }
    catch (error) {
        console.error('Error during synchronization:', error);
        res.status(500).json({ error: 'Error interno en sincronización de visitas', details: error.message });
    }
});
// GET LIST OF ALL VISITS (Admin Only)
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const visits = await db_1.default.visit.findMany({
            include: {
                customer: true,
                merchandiser: {
                    include: { user: true }
                },
                photos: true,
                inventories: {
                    include: { article: true }
                },
                prices: {
                    include: { article: true }
                },
                exhibitions: true
            },
            orderBy: { startTime: 'desc' }
        });
        res.json(visits);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener visitas' });
    }
});
// GET ONE VISIT
router.get('/:id', auth_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    try {
        const visit = await db_1.default.visit.findUnique({
            where: { id },
            include: {
                customer: true,
                merchandiser: {
                    include: { user: true }
                },
                photos: true,
                inventories: {
                    include: { article: true }
                },
                prices: {
                    include: { article: true }
                },
                exhibitions: true
            }
        });
        if (!visit) {
            return res.status(404).json({ error: 'Visita no encontrada' });
        }
        res.json(visit);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener la visita' });
    }
});
exports.default = router;
