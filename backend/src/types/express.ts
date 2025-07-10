import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: any;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  uptime: number;
  version: string;
  services?: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    vectorStore: 'healthy' | 'unhealthy';
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

export type ErrorRequestHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

export interface ApiEndpoint {
  path: string;
  methods: string[];
  description: string;
}