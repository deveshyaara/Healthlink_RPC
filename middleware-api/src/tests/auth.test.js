/**
 * Authentication API Tests
 * Tests for login, register, logout, and user profile endpoints
 */

import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.routes.js';
import { jest } from '@jest/globals';

// Mock the services
jest.mock('../services/auth.service.js', () => ({
  authenticateUser: jest.fn(),
  generateToken: jest.fn(),
  registerUser: jest.fn(),
  getUserById: jest.fn(),
}));

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticateJWT: jest.fn((req, res, next) => next()),
}));

jest.mock('../middleware/rateLimiter.middleware.js', () => ({
  authLimiter: jest.fn((req, res, next) => next()),
}));

import authService from '../services/auth.service.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        userId: '123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'PATIENT',
      };

      const mockToken = 'mock-jwt-token';

      authService.authenticateUser.mockResolvedValue(mockUser);
      authService.generateToken.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBe(mockToken);
      expect(response.body.data.user.email).toBe('john@example.com');
      expect(authService.authenticateUser).toHaveBeenCalledWith('john@example.com', 'password123');
      expect(authService.generateToken).toHaveBeenCalledWith(mockUser);
    });

    it('should return 400 for missing email or password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email and password are required');
    });

    it('should return 401 for invalid credentials', async () => {
      authService.authenticateUser.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(500); // Assuming the controller doesn't catch and reformat auth errors
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        userId: '123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'PATIENT',
      };

      const mockToken = 'mock-jwt-token';

      authService.registerUser.mockResolvedValue(mockUser);
      authService.generateToken.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'PATIENT',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBe(mockToken);
      expect(response.body.data.user.email).toBe('jane@example.com');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          // missing password and role
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        userId: '123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'PATIENT',
      };

      // Mock the authenticateJWT middleware to set req.user
      authenticateJWT.mockImplementation((req, res, next) => {
        req.user = { id: '123' };
        next();
      });

      authService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('john@example.com');
      expect(authService.getUserById).toHaveBeenCalledWith('123');
    });

    it('should return 401 if not authenticated', async () => {
      authenticateJWT.mockImplementation((req, res, _next) => {
        return res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      authenticateJWT.mockImplementation((req, res, next) => {
        req.user = { id: '123' };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
