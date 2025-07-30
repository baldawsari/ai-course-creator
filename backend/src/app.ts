import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Types for error handling
interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Create Express app
const app: Application = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.anthropic.com", "https://api.jina.ai", "https://*.supabase.co"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));

// Body parsing middleware
const maxFileSize = process.env.MAX_FILE_SIZE || '50mb';
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('X-Request-ID') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', requestId);
  next();
});

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  const morganFormat = process.env.NODE_ENV === 'development' ? 'dev' : 'combined';
  app.use(morgan(morganFormat));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const coursesRoutes = require('./routes/courses');
const generationRoutes = require('./routes/generation');
const exportRoutes = require('./routes/export');
const sessionsRoutes = require('./routes/sessions');
const profileRoutes = require('./routes/profile');
const dashboardRoutes = require('./routes/dashboard');

// Health check endpoint
app.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  };

  res.status(200).json(healthData);
}));

// API routes with rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/upload', limiter, uploadRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/generation', limiter, generationRoutes);
app.use('/api/export', limiter, exportRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);

// API documentation endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'AI Course Creator API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/auth',
        upload: '/api/upload',
        courses: '/api/courses',
        sessions: '/api/sessions',
        generation: '/api/generation',
        export: '/api/export',
        profile: '/api/profile',
        dashboard: '/api/dashboard',
        health: '/health'
      }
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 Not Found handler
app.use((req: Request, _res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Global error handler
app.use((err: CustomError, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  let error = { ...err };
  error.message = err.message;

  // Joi validation error
  if (err.name === 'ValidationError' && (err as any).isJoi) {
    const message = (err as any).details.map((detail: any) => detail.message).join(', ');
    error = { name: 'ValidationError', message, status: 400 } as CustomError;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { name: 'JsonWebTokenError', message: 'Invalid token', status: 401 } as CustomError;
  }

  if (err.name === 'TokenExpiredError') {
    error = { name: 'TokenExpiredError', message: 'Token expired', status: 401 } as CustomError;
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { name: 'MulterError', message: 'File too large', status: 400 } as CustomError;
  }

  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    status,
    timestamp: new Date().toISOString(),
    requestId: req.get('X-Request-ID'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.info(`${signal} received. Starting graceful shutdown...`);
  
  // TODO: Close database connections, Redis connections, etc.
  
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('Unhandled Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('Uncaught Exception');
});

export default app;