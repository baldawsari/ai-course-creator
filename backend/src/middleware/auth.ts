/// <reference path="../types/global.d.ts" />
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database';
import { env } from '../config/environment';

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')?.[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

export const refreshSession = async (refreshToken: string) => {
  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    throw new Error('Invalid refresh token');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
};

export const rateLimitByUser = (_options: { max: number; windowMs: number; message?: string }) => {
  // This is a placeholder for a real rate limiting implementation
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
};