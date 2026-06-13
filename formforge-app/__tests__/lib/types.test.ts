import type {
  Template, RangeParam, BoolParam, TextParam, SelectParam,
  GenerateResponse, ValidationResult, SubscriptionTier,
} from '../../lib/types';

// Type-level tests — these fail at compile time if types change incompatibly.
// Runtime tests verify runtime narrowing and defaults.

describe('TemplateParam type narrowing', () => {
  it('range param has min/max/unit', () => {
    const p: RangeParam = { type: 'range', min: 10, max: 200, default: 50, unit: 'mm', label: 'Width' };
    expect(p.type).toBe('range');
    expect(p.min).toBeLessThan(p.max);
  });

  it('bool param has boolean default', () => {
    const p: BoolParam = { type: 'bool', default: false, label: 'Toggle' };
    expect(typeof p.default).toBe('boolean');
  });

  it('text param has string default', () => {
    const p: TextParam = { type: 'text', default: 'Hello', label: 'Name' };
    expect(typeof p.default).toBe('string');
  });

  it('select param has options array', () => {
    const p: SelectParam = { type: 'select', default: 'rounded', options: ['rounded', 'sharp'], label: 'Style' };
    expect(p.options).toContain(p.default);
  });
});

describe('GenerateResponse shape', () => {
  it('has all required file URLs', () => {
    const r: GenerateResponse = {
      job_id: 'abc-123',
      stl_url: 'http://x/a.stl',
      glb_url: 'http://x/a.glb',
      tmf_url: 'http://x/a.3mf',
      validation: { manifold: true, wall_thickness_ok: true, warnings: [] },
      execution_time_ms: 420,
    };
    expect(r.stl_url).toMatch(/\.stl$/);
    expect(r.validation.manifold).toBe(true);
    expect(r.validation.warnings).toHaveLength(0);
  });
});

describe('SubscriptionTier', () => {
  it('accepts only valid tiers', () => {
    const tiers: SubscriptionTier[] = ['free', 'pro', 'studio'];
    expect(tiers).toHaveLength(3);
  });
});
