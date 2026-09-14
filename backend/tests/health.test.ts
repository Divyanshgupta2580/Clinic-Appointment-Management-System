import request from 'supertest';
import { createApp } from '../src/app';

describe('Health Endpoint Tests', () => {
  const app = createApp();

  it('GET /health should return 200 or 503 with system metrics', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503); // DB not connected in pure unit test without connectDB()
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
  });
});
