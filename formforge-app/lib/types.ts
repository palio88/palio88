export type ParamType = 'range' | 'bool' | 'text' | 'select';

export interface RangeParam {
  type: 'range';
  min: number;
  max: number;
  default: number;
  unit: string;
  label: string;
}

export interface BoolParam {
  type: 'bool';
  default: boolean;
  label: string;
}

export interface TextParam {
  type: 'text';
  default: string;
  label: string;
}

export interface SelectParam {
  type: 'select';
  default: string;
  options: string[];
  label: string;
}

export type TemplateParam = RangeParam | BoolParam | TextParam | SelectParam;

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  tags: string[];
  free: boolean;
  params: Record<string, TemplateParam>;
}

export type JobStatus = 'queued' | 'generating' | 'validating' | 'exporting' | 'ready' | 'failed';

// ─── Print report (returned by CAD worker v2) ─────────────────────────────────

export interface PrintIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  detail?: string;
}

export interface DimensionInfo {
  x: number;
  y: number;
  z: number;
  volume_cm3: number;
  surface_area_cm2: number;
}

export interface BedFitResult {
  printer: string;
  fits: boolean;
  bed_x: number;
  bed_y: number;
  bed_z: number;
  margin_x: number;
  margin_y: number;
  margin_z: number;
}

export interface PrintReport {
  is_printable: boolean;
  errors: PrintIssue[];
  warnings: PrintIssue[];
  info: PrintIssue[];
  dimensions: DimensionInfo | null;
  bed_fit: Record<string, BedFitResult>;
  estimated_support_needed: boolean;
  wall_thickness_min_mm: number | null;
  overhang_fraction: number;
}

// ─── Legacy validation result (mock mode / v1 compat) ────────────────────────

export interface ValidationResult {
  manifold: boolean;
  wall_thickness_ok: boolean;
  warnings: string[];
}

export interface GenerateResponse {
  job_id: string;
  stl_url: string;
  glb_url: string;
  tmf_url: string;
  print_report?: PrintReport;
  /** @deprecated use print_report — kept for mock mode compat */
  validation?: ValidationResult;
  execution_time_ms: number;
}

export interface SavedDesign {
  id: string;
  user_id: string;
  template_id: string;
  template_name: string;
  params: Record<string, unknown>;
  stl_url: string | null;
  glb_url: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'studio';
