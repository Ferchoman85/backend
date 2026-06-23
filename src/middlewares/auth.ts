import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-integra-trade-2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'MERCADERISTA';
  };
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }

      req.user = user as any;
      next();
    });
  } else {
    res.status(401).json({ error: 'Encabezado de autorización no provisto' });
  }
}

export function requireRole(roles: ('ADMIN' | 'MERCADERISTA')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado: permisos insuficientes' });
    }

    next();
  };
}
