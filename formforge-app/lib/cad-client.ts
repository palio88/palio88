import type { GenerateResponse, Template } from './types';

const CAD_WORKER_URL = process.env.EXPO_PUBLIC_CAD_WORKER_URL ?? 'http://localhost:8001';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_CAD === 'true';

export async function generateParametric(
  template: Template,
  params: Record<string, unknown>,
): Promise<GenerateResponse> {
  if (MOCK_MODE) {
    return mockGenerate(template, params);
  }

  const templateCode = await fetchTemplateCode(template.id);

  const response = await fetch(`${CAD_WORKER_URL}/parametric`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: template.id,
      template_code: templateCode,
      params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error((error as { detail?: string })?.detail ?? `CAD worker error ${response.status}`);
  }

  return response.json() as Promise<GenerateResponse>;
}

async function fetchTemplateCode(templateId: string): Promise<string> {
  const res = await fetch(`${API_URL}/templates/${templateId}/code`);
  if (!res.ok) throw new Error(`Failed to fetch template code for ${templateId}`);
  const data = await res.json() as { code: string };
  return data.code;
}

export async function checkWorkerHealth(): Promise<boolean> {
  if (MOCK_MODE) return true;
  try {
    const res = await fetch(`${CAD_WORKER_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Mock implementation (simulator / offline dev) ───────────────────────────

async function mockGenerate(
  template: Template,
  params: Record<string, unknown>,
): Promise<GenerateResponse> {
  // Simulate realistic generation time (300–900ms)
  const delay = 300 + Math.random() * 600;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const jobId = `mock_${Date.now()}`;
  const wallT = Number(params['wall_thickness'] ?? params['thickness'] ?? 2);

  return {
    job_id: jobId,
    stl_url: `mock://files/${jobId}/output.stl`,
    glb_url: `mock://files/${jobId}/output.glb`,
    tmf_url: `mock://files/${jobId}/output.3mf`,
    print_report: {
      is_printable: wallT >= 1.2,
      errors: wallT < 1.2 ? [{
        severity: 'error' as const,
        code: 'WALL_TOO_THIN',
        message: `Wall thickness ${wallT}mm is below printable minimum of 1.2mm.`,
        detail: 'Increase wall thickness in the parameter editor.',
      }] : [],
      warnings: wallT >= 1.2 && wallT < 1.5 ? [{
        severity: 'warning' as const,
        code: 'WALL_THIN',
        message: `Wall thickness ${wallT}mm is below recommended 1.5mm.`,
        detail: 'Walls may be fragile. Increase for better durability.',
      }] : [],
      info: wallT >= 1.5 ? [{
        severity: 'info' as const,
        code: 'PRINT_READY',
        message: 'Geometry passed all print-readiness checks.',
      }] : [],
      dimensions: {
        x: Number(params['width'] ?? params['plate_width'] ?? 100),
        y: Number(params['depth'] ?? params['plate_height'] ?? 80),
        z: Number(params['height'] ?? params['plate_depth'] ?? 60),
        volume_cm3: 0,
        surface_area_cm2: 0,
      },
      bed_fit: {
        bambu_x1c:  { printer: 'bambu_x1c',  fits: true,  bed_x: 256, bed_y: 256, bed_z: 256, margin_x: 0, margin_y: 0, margin_z: 0 },
        prusa_mk4:  { printer: 'prusa_mk4',  fits: true,  bed_x: 250, bed_y: 210, bed_z: 220, margin_x: 0, margin_y: 0, margin_z: 0 },
        ender_3:    { printer: 'ender_3',    fits: true,  bed_x: 220, bed_y: 220, bed_z: 250, margin_x: 0, margin_y: 0, margin_z: 0 },
        generic_fdm:{ printer: 'generic_fdm',fits: true,  bed_x: 220, bed_y: 220, bed_z: 220, margin_x: 0, margin_y: 0, margin_z: 0 },
      },
      estimated_support_needed: false,
      wall_thickness_min_mm: wallT,
      overhang_fraction: 0,
    },
    execution_time_ms: Math.round(delay),
  };
}
