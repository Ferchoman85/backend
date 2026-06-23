"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// LIST ALL ARTICLES
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const articles = await db_1.default.article.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(articles);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener artículos' });
    }
});
// CREATE ARTICLE (Admin Only)
router.post('/', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { code, name, brand, category, suggestedPrice } = req.body;
    if (!code || !name || !brand || !category || suggestedPrice === undefined) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    try {
        const existingArticle = await db_1.default.article.findUnique({ where: { code } });
        if (existingArticle) {
            return res.status(400).json({ error: 'El código de artículo ya existe' });
        }
        const article = await db_1.default.article.create({
            data: {
                code,
                name,
                brand,
                category,
                suggestedPrice: parseFloat(suggestedPrice)
            }
        });
        res.status(201).json({
            message: 'Artículo creado exitosamente',
            article
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear artículo' });
    }
});
// UPDATE ARTICLE (Admin Only)
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { code, name, brand, category, suggestedPrice, isActive } = req.body;
    try {
        const article = await db_1.default.article.findUnique({ where: { id } });
        if (!article) {
            return res.status(404).json({ error: 'Artículo no encontrado' });
        }
        const updateData = {};
        if (code !== undefined)
            updateData.code = code;
        if (name !== undefined)
            updateData.name = name;
        if (brand !== undefined)
            updateData.brand = brand;
        if (category !== undefined)
            updateData.category = category;
        if (suggestedPrice !== undefined)
            updateData.suggestedPrice = parseFloat(suggestedPrice);
        if (isActive !== undefined)
            updateData.isActive = isActive;
        const updatedArticle = await db_1.default.article.update({
            where: { id },
            data: updateData
        });
        res.json({
            message: 'Artículo actualizado exitosamente',
            article: updatedArticle
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar artículo' });
    }
});
// TOGGLE ARTICLE STATE (Admin Only)
router.patch('/:id/toggle-state', auth_1.authenticateJWT, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        const article = await db_1.default.article.findUnique({ where: { id } });
        if (!article) {
            return res.status(404).json({ error: 'Artículo no encontrado' });
        }
        const updatedArticle = await db_1.default.article.update({
            where: { id },
            data: { isActive: !article.isActive }
        });
        res.json({
            message: `Artículo ${updatedArticle.isActive ? 'activado' : 'inactivado'} exitosamente`,
            isActive: updatedArticle.isActive
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado del artículo' });
    }
});
exports.default = router;
