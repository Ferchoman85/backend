import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateJWT, requireRole, AuthRequest } from '../middlewares/auth';

const router = Router();

// LIST ALL ROUTES (Admin and Merchandiser)
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { merchandiserId } = req.query;

    const filter: any = {};
    if (merchandiserId) {
      filter.merchandiserId = merchandiserId as string;
    }

    const routes = await prisma.route.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rutas' });
  }
});

// CREATE ROUTE WITH CUSTOMERS (Admin Only)
router.post('/', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { name, merchandiserId, customers } = req.body;
  // customers is an array of: { customerId: string, order: number, visitDays: string[] }

  if (!name || !merchandiserId || !customers || !Array.isArray(customers)) {
    return res.status(400).json({ error: 'Faltan campos obligatorios o formato inválido' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Route
      const route = await tx.route.create({
        data: {
          name,
          merchandiserId
        }
      });

      // 2. Create RouteCustomers
      const routeCustomersData = customers.map((c: any) => ({
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
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la ruta' });
  }
});

// DELETE ROUTE (Admin Only)
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.route.delete({
      where: { id }
    });

    res.json({ message: 'Ruta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la ruta' });
  }
});

export default router;
