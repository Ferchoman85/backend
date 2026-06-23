"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// GENERATE EXCEL REPORT (Inventories and Prices)
router.get('/visits/excel', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const visits = await db_1.default.visit.findMany({
            include: {
                customer: true,
                merchandiser: { include: { user: true } },
                inventories: { include: { article: true } },
                prices: { include: { article: true } },
                exhibitions: true
            },
            orderBy: { startTime: 'desc' }
        });
        const workbook = new exceljs_1.default.Workbook();
        // Sheet 1: Inventarios
        const invSheet = workbook.addWorksheet('Inventarios');
        invSheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 12 },
            { header: 'Mercaderista', key: 'mercaderista', width: 25 },
            { header: 'Cliente (Código)', key: 'cliente_codigo', width: 15 },
            { header: 'Cliente (Nombre)', key: 'cliente_nombre', width: 30 },
            { header: 'Artículo', key: 'articulo', width: 30 },
            { header: 'Código Artículo', key: 'articulo_codigo', width: 15 },
            { header: 'Stock Físico', key: 'stock', width: 12 },
            { header: 'Stock Bodega', key: 'bodega', width: 12 },
            { header: 'Observaciones', key: 'observaciones', width: 30 }
        ];
        // Format headers
        invSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        invSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '0F172A' } // Dark Navy
        };
        // Sheet 2: Precios
        const priceSheet = workbook.addWorksheet('Precios Encontrados');
        priceSheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 12 },
            { header: 'Mercaderista', key: 'mercaderista', width: 25 },
            { header: 'Cliente (Código)', key: 'cliente_codigo', width: 15 },
            { header: 'Cliente (Nombre)', key: 'cliente_nombre', width: 30 },
            { header: 'Artículo', key: 'articulo', width: 30 },
            { header: 'Precio Sugerido', key: 'sugerido', width: 15 },
            { header: 'Precio Encontrado', key: 'encontrado', width: 15 },
            { header: 'Desviación', key: 'desviacion', width: 12 },
            { header: 'Observaciones', key: 'observaciones', width: 30 }
        ];
        priceSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        priceSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '0F172A' }
        };
        // Populate data
        for (const v of visits) {
            const fechaStr = new Date(v.startTime).toLocaleDateString('es-ES');
            const mercName = v.merchandiser.user.name;
            const clientCode = v.customer.code;
            const clientName = v.customer.name;
            // Add inventories
            for (const inv of v.inventories) {
                invSheet.addRow({
                    fecha: fechaStr,
                    mercaderista: mercName,
                    cliente_codigo: clientCode,
                    cliente_nombre: clientName,
                    articulo: inv.article.name,
                    articulo_codigo: inv.article.code,
                    stock: inv.stockQty,
                    bodega: inv.warehouseQty,
                    observaciones: inv.observations || ''
                });
            }
            // Add prices
            for (const pr of v.prices) {
                const sugerido = pr.article.suggestedPrice;
                const encontrado = pr.foundPrice;
                const desviacion = (encontrado - sugerido).toFixed(2);
                priceSheet.addRow({
                    fecha: fechaStr,
                    mercaderista: mercName,
                    cliente_codigo: clientCode,
                    cliente_nombre: clientName,
                    articulo: pr.article.name,
                    sugerido,
                    encontrado,
                    desviacion,
                    observaciones: pr.observations || ''
                });
            }
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_visitas.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: 'Error al generar reporte Excel' });
    }
});
// GENERATE PDF REPORT (Visits, Exhibits, and Photographic Evidences)
router.get('/visits/pdf', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const visits = await db_1.default.visit.findMany({
            include: {
                customer: true,
                merchandiser: { include: { user: true } },
                photos: true,
                exhibitions: true
            },
            orderBy: { startTime: 'desc' }
        });
        const doc = new pdfkit_1.default({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_visitas.pdf');
        doc.pipe(res);
        // Title / Header
        doc.fillColor('#0F172A').fontSize(24).text('INTEGRA TRADE', { align: 'center', bold: true });
        doc.fillColor('#F59E0B').fontSize(12).text('Gestión de Mercaderistas • Evidencia Fotográfica y Cumplimiento', { align: 'center' });
        doc.moveDown(1.5);
        doc.fillColor('#334155').fontSize(10).text(`Reporte generado el: ${new Date().toLocaleString('es-ES')}`, { align: 'right' });
        doc.moveDown(1);
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1);
        // Loop visits
        for (let i = 0; i < visits.length; i++) {
            const v = visits[i];
            // Prevent page overflow for new visits
            if (doc.y > 600) {
                doc.addPage();
            }
            doc.fillColor('#0F172A').fontSize(14).text(`Visita: ${v.customer.name} (${v.customer.code})`, { bold: true });
            doc.fontSize(10).fillColor('#475569');
            const duracion = v.endTime
                ? `${Math.round((new Date(v.endTime).getTime() - new Date(v.startTime).getTime()) / 60000)} min`
                : 'En curso';
            doc.text(`Mercaderista: ${v.merchandiser.user.name}`);
            doc.text(`Fecha y Hora: ${new Date(v.startTime).toLocaleString('es-ES')}`);
            doc.text(`Duración: ${duracion}`);
            doc.text(`Ubicación GPS: Lat ${v.startLatitude.toFixed(6)}, Lng ${v.startLongitude.toFixed(6)}`);
            if (v.observations) {
                doc.text(`Observaciones: ${v.observations}`);
            }
            // Exhibition checklist
            if (v.exhibitions) {
                doc.moveDown(0.5);
                doc.fillColor('#0F172A').fontSize(10).text('Checklist de Exhibición:', { bold: true });
                doc.fillColor('#475569');
                doc.text(`- Producto Exhibido: ${v.exhibitions.productExhibited ? 'Sí' : 'No'}`);
                doc.text(`- Agotados en Góndola: ${v.exhibitions.productOutOfStock ? 'Sí' : 'No'}`);
                doc.text(`- Material POP Instalado: ${v.exhibitions.popInstalled ? 'Sí' : 'No'}`);
                doc.text(`- Presencia Competencia: ${v.exhibitions.competitorPresent ? 'Sí' : 'No'}`);
            }
            // Render photos if any
            if (v.photos && v.photos.length > 0) {
                doc.moveDown(1);
                doc.fillColor('#0F172A').fontSize(11).text('Evidencia Fotográfica:', { bold: true });
                doc.moveDown(0.5);
                let photoX = 40;
                for (const photo of v.photos) {
                    const photoPath = path_1.default.join(__dirname, '../../', photo.photoUrl);
                    if (fs_1.default.existsSync(photoPath)) {
                        // Draw photo thumbnails
                        try {
                            // Ensure we don't bleed off the bottom page
                            if (doc.y > 600) {
                                doc.addPage();
                            }
                            doc.image(photoPath, photoX, doc.y, { width: 120, height: 90 });
                            doc.fontSize(8).fillColor('#64748B').text(`${photo.type} - GPS Validado`, photoX, doc.y + 92, { width: 120, align: 'center' });
                            photoX += 130;
                            if (photoX > 450) {
                                photoX = 40;
                                doc.moveDown(6.5); // move down below images row
                            }
                        }
                        catch (e) {
                            doc.text(`[Error cargando imagen: ${photo.photoUrl}]`);
                        }
                    }
                    else {
                        doc.text(`[Imagen no disponible en disco: ${photo.photoUrl}]`);
                    }
                }
                if (photoX !== 40) {
                    doc.moveDown(7);
                }
            }
            // Render signature if exists
            if (v.signatureUrl) {
                const sigPath = path_1.default.join(__dirname, '../../', v.signatureUrl);
                if (fs_1.default.existsSync(sigPath)) {
                    if (doc.y > 650) {
                        doc.addPage();
                    }
                    doc.moveDown(1);
                    doc.fillColor('#0F172A').fontSize(10).text('Firma Digital del Cliente:', { bold: true });
                    doc.image(sigPath, 40, doc.y, { width: 100, height: 50 });
                    doc.moveDown(4.5);
                }
            }
            doc.moveDown(1.5);
            doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
            doc.moveDown(1.5);
        }
        doc.end();
    }
    catch (error) {
        res.status(500).json({ error: 'Error al generar reporte PDF' });
    }
});
exports.default = router;
