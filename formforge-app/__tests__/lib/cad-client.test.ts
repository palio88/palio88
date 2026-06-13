// Run with EXPO_PUBLIC_MOCK_CAD=true so no real network calls are made.
process.env.EXPO_PUBLIC_MOCK_CAD = 'true';

import { generateParametric, checkWorkerHealth } from '../../lib/cad-client';
import type { Template } from '../../lib/types';

const mockTemplate: Template = {
  id: 'simple_box',
  name: 'Simple Box',
  category: 'storage',
  description: 'Test box',
  thumbnail: 'simple_box.png',
  tags: [],
  free: true,
  params: {
    width: { type: 'range', min: 50, max: 300, default: 100, unit: 'mm', label: 'Width' },
    wall_thickness: { type: 'range', min: 1.5, max: 5, default: 2, unit: 'mm', label: 'Wall' },
  },
};

describe('generateParametric (mock mode)', () => {
  it('resolves within 2 seconds in mock mode', async () => {
    const start = Date.now();
    const result = await generateParametric(mockTemplate, { width: 100, wall_thickness: 2 });
    expect(Date.now() - start).toBeLessThan(2000);
    expect(result.job_id).toMatch(/^mock_/);
  }, 5000);

  it('returns valid file URLs', async () => {
    const result = await generateParametric(mockTemplate, { width: 100, wall_thickness: 2 });
    expect(result.stl_url).toBeTruthy();
    expect(result.glb_url).toBeTruthy();
    expect(result.tmf_url).toBeTruthy();
  }, 5000);

  it('flags wall thickness below 1.5mm', async () => {
    const result = await generateParametric(mockTemplate, { width: 100, wall_thickness: 1.0 });
    expect(result.validation.wall_thickness_ok).toBe(false);
    expect(result.validation.warnings.length).toBeGreaterThan(0);
  }, 5000);

  it('passes validation for good params', async () => {
    const result = await generateParametric(mockTemplate, { width: 100, wall_thickness: 2 });
    expect(result.validation.manifold).toBe(true);
    expect(result.validation.wall_thickness_ok).toBe(true);
  }, 5000);
});

describe('checkWorkerHealth (mock mode)', () => {
  it('returns true in mock mode', async () => {
    const healthy = await checkWorkerHealth();
    expect(healthy).toBe(true);
  });
});
