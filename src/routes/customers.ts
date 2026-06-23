import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateJWT, requireRole, AuthRequest } from '../middlewares/auth';

const router = Router();

// LIST ALL CUSTOMERS (Admin and Merchandiser)
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET ONE CUSTOMER
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// CREATE CUSTOMER (Admin Only)
router.post('/', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { code, name, address, latitude, longitude, phone, contact } = req.body;

  if (!code || !name || !address || latitude === undefined || longitude === undefined || !phone || !contact) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const existingCustomer = await prisma.customer.findUnique({ where: { code } });
    if (existingCustomer) {
      return res.status(400).json({ error: 'El código de cliente ya existe' });
    }

    const customer = await prisma.customer.create({
      data: {
        code,
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        phone,
        contact
      }
    });

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      customer
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// UPDATE CUSTOMER (Admin Only)
router.put('/:id', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, address, latitude, longitude, phone, contact, isActive } = req.body;

  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (phone !== undefined) updateData.phone = phone;
    if (contact !== undefined) updateData.contact = contact;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Cliente actualizado exitosamente',
      customer: updatedCustomer
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// TOGGLE CUSTOMER STATE (Admin Only)
router.patch('/:id/toggle-state', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { isActive: !customer.isActive }
    });

    res.json({
      message: `Cliente ${updatedCustomer.isActive ? 'activado' : 'inactivado'} exitosamente`,
      isActive: updatedCustomer.isActive
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del cliente' });
  }
});

export default router;
