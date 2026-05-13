import express from 'express';
import request from 'supertest';
import { authRoutes } from '../routes/auth';

// Mock the database connection
jest.mock('../database/connection', () => ({
  query: jest.fn(),
}));

import { query } from '../database/connection';
const mockQuery = query as jest.MockedFunction<typeof query>;

const app = express();
app.use(express.json());
app.use('', authRoutes);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /register', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/register').send({ password: 'password123', firstName: 'John', lastName: 'Doe' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app).post('/register').send({ email: 'not-an-email', password: 'password123', firstName: 'John', lastName: 'Doe' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/register').send({ email: 'test@example.com', password: 'short', firstName: 'John', lastName: 'Doe' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it('returns 400 when firstName is missing', async () => {
    const res = await request(app).post('/register').send({ email: 'test@example.com', password: 'password123', lastName: 'Doe' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/first name/i);
  });

  it('returns 400 when lastName is missing', async () => {
    const res = await request(app).post('/register').send({ email: 'test@example.com', password: 'password123', firstName: 'John' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/last name/i);
  });

  it('returns 400 when email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }], rowCount: 1, command: '', oid: 0, fields: [] });
    const res = await request(app).post('/register').send({ email: 'existing@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('returns 201 and user on success', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] }) // no existing user
      .mockResolvedValueOnce({
        rows: [{
          id: 'new-uuid',
          email: 'newuser@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1, command: '', oid: 0, fields: [],
      });

    const res = await request(app).post('/register').send({ email: 'newuser@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(res.body.token).toBeDefined();
  });
});

describe('POST /login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/login').send({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password/i);
  });

  it('returns 401 when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });
    const res = await request(app).post('/login').send({ email: 'ghost@example.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('rejects the demo backdoor password', async () => {
    const res = await request(app).post('/login').send({ email: 'anyone@example.com', password: 'demo' });
    // Should not bypass auth — either returns 401 (user not found) or validates normally
    expect(res.status).not.toBe(200);
  });

  it('returns 200 and token on valid credentials', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'user-uuid',
        email: 'user@example.com',
        password_hash: hash,
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });

    const res = await request(app).post('/login').send({ email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.token).toBeDefined();
  });
});

describe('POST /logout', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

describe('GET /me', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  it('returns user when valid token provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'user-uuid',
        email: 'user@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'customer',
        created_at: new Date().toISOString(),
      }],
      rowCount: 1, command: '', oid: 0, fields: [],
    });

    const res = await request(app).get('/me').set('Authorization', 'Bearer user-uuid');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user@example.com');
  });
});
