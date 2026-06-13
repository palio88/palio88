import type { GenerateResponse, Template } from './types';

const CAD_WORKER_URL = process.env.EXPO_PUBLIC_CAD_WORKER_URL ?? 'http://localhost:8001';

export async function generateParametric(
  template: Template,
  params: Record<string, unknown>,
): Promise<GenerateResponse> {
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
    throw new Error(error?.detail ?? `CAD worker error ${response.status}`);
  }

  return response.json() as Promise<GenerateResponse>;
}

async function fetchTemplateCode(templateId: string): Promise<string> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
  const res = await fetch(`${API_URL}/templates/${templateId}/code`);
  if (!res.ok) throw new Error(`Failed to fetch template code for ${templateId}`);
  const data = await res.json() as { code: string };
  return data.code;
}

export async function checkWorkerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${CAD_WORKER_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
