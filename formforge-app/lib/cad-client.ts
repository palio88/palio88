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
    validation: {
      manifold: true,
      wall_thickness_ok: wallT >= 1.5,
      warnings: wallT < 1.5
        ? [`Wall thickness ${wallT}mm is below recommended 1.5mm minimum.`]
        : [],
    },
    execution_time_ms: Math.round(delay),
  };
}
