import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';

const router = Router();

// Helper to save base64 string as image file
function saveBase64Image(base64Str: string, prefix: string): string {
  // Clean base64 header if present (e.g. data:image/png;base64,)
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let dataBuffer: Buffer;

  if (matches && matches.length === 3) {
    dataBuffer = Buffer.from(matches[2], 'base64');
  } else {
    dataBuffer = Buffer.from(base64Str, 'base64');
  }

  const filename = `${prefix}_${uuidv4()}.png`;
  const uploadPath = path.join(__dirname, '../../uploads', filename);

  fs.writeFileSync(uploadPath, dataBuffer);
  return `/uploads/${filename}`;
}

// BULK SYNC ENDPOINT (Offline mode sync support)
router.post('/sync', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { visits } = req.body; // Array of visits

  if (!visits || !Array.isArray(visits)) {
    return res.status(400).json({ error: 'Payload de sincronización inválido' });
  }

  const syncedIds: string[] = [];

  try {
    for (const v of visits) {
      // Destructure visit payload
      const {
        localId, // ID generated on mobile (we can use it or generate uuid)
        customerId,
        merchandiserId,
        startTime,
        endTime,
        startLatitude,
        startLongitude,
        endLatitude,
        endLongitude,
        observations,
        signatureBase64,
        inventories, // [{ articleId, stockQty, warehouseQty, observations }]
        prices,      // [{ articleId, foundPrice, observations }]
        exhibition,  // { productExhibited, productOutOfStock, popInstalled, competitorPresent }
        photos       // [{ type: 'ANTES' | 'DESPUES', base64: string, latitude, longitude, takenAt }]
      } = v;

      // Skip if basic fields are missing
      if (!customerId || !merchandiserId || !startTime) {
        continue;
      }

      await prisma.$transaction(async (tx) => {
        // 1. Process Signature if provided
        let signatureUrl: string | null = null;
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
          const inventoryData = inventories.map((inv: any) => ({
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
          const priceData = prices.map((pr: any) => ({
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
  } catch (error: any) {
    console.error('Error during synchronization:', error);
    res.status(500).json({ error: 'Error interno en sincronización de visitas', details: error.message });
  }
});

// GET LIST OF ALL VISITS (Admin Only)
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const visits = await prisma.visit.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener visitas' });
  }
});

// GET ONE VISIT
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const visit = await prisma.visit.findUnique({
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la visita' });
  }
});

export default router;
