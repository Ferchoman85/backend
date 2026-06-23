import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateJWT, requireRole, AuthRequest } from '../middlewares/auth';

const router = Router();

// LIST ALL ARTICLES
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener artículos' });
  }
});

// CREATE ARTICLE (Admin Only)
router.post('/', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { code, name, brand, category, suggestedPrice } = req.body;

  if (!code || !name || !brand || !category || suggestedPrice === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const existingArticle = await prisma.article.findUnique({ where: { code } });
    if (existingArticle) {
      return res.status(400).json({ error: 'El código de artículo ya existe' });
    }

    const article = await prisma.article.create({
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
  } catch (error) {
    res.status(500).json({ error: 'Error al crear artículo' });
  }
});

// UPDATE ARTICLE (Admin Only)
router.put('/:id', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, brand, category, suggestedPrice, isActive } = req.body;

  try {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (category !== undefined) updateData.category = category;
    if (suggestedPrice !== undefined) updateData.suggestedPrice = parseFloat(suggestedPrice);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedArticle = await prisma.article.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Artículo actualizado exitosamente',
      article: updatedArticle
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar artículo' });
  }
});

// TOGGLE ARTICLE STATE (Admin Only)
router.patch('/:id/toggle-state', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    const updatedArticle = await prisma.article.update({
      where: { id },
      data: { isActive: !article.isActive }
    });

    res.json({
      message: `Artículo ${updatedArticle.isActive ? 'activado' : 'inactivado'} exitosamente`,
      isActive: updatedArticle.isActive
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del artículo' });
  }
});

export default router;
