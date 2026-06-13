# FormForge — Claude Code Project Brief

## What this is

FormForge is an iOS-first mobile app for parametric 3D print design. Users pick a curated template, adjust sliders, and get a print-validated STL/3MF file in seconds. No CAD knowledge required.

**Current branch:** `claude/formforge-launch-plan-v2-5ms83o`
**Stage:** Session 1–3 complete. Core scaffold, CAD worker, API, and printer compatibility layer all built. Next: RevenueCat paywall, real 3D preview, AsyncStorage preferences, and TestFlight prep.

---

## Repo structure

```
palio88/
├── formforge-app/          # React Native / Expo 52 app (iOS first)
│   ├── app/
│   │   ├── (tabs)/         # Browse, My Designs, Account tabs
│   │   ├── auth/           # sign-in.tsx, sign-up.tsx
│   │   ├── editor/         # [templateId].tsx — parameter editor + export
│   │   └── onboarding.tsx  # 3-slide first-run flow
│   ├── components/
│   │   ├── ParameterEditor.tsx      # range/bool/text/select controls
│   │   ├── PrintReadinessReport.tsx # collapsed bar + pageSheet modal
│   │   ├── Preview3D.tsx            # stub — needs expo-gl/r3f wiring
│   │   ├── TemplateCard.tsx         # grid card with PRO badge
│   │   ├── UpgradePrompt.tsx        # bottom-sheet paywall modal
│   │   └── ValidationBadge.tsx      # legacy — superseded by PrintReadinessReport
│   ├── constants/tokens.ts          # all colors, spacing, radius
│   ├── data/templates.json          # 5-template registry with params + print_hints
│   ├── hooks/useDesignSave.ts       # Supabase save + analytics
│   ├── lib/
│   │   ├── analytics.ts    # PostHog wrapper + typed Events catalogue
│   │   ├── cad-client.ts   # generateParametric() — real or mock via EXPO_PUBLIC_MOCK_CAD
│   │   ├── entitlements.ts # useRevenueCat() + useTierGate(tier)
│   │   ├── export.ts       # STL/3MF download via expo-file-system + expo-sharing
│   │   ├── printers.ts     # 8 printer profiles + checkFitsOnBed()
│   │   ├── supabase.ts     # Supabase client with AsyncStorage session
│   │   └── types.ts        # all shared types (Template, PrintReport, GenerateResponse…)
│   ├── stores/
│   │   ├── auth.store.ts   # Zustand — session, tier, sign-in/out
│   │   └── design.store.ts # Zustand — activeTemplate, params, generate(), lastGeneration
│   ├── __tests__/          # jest-expo tests for stores, types, cad-client, export
│   ├── babel.config.js     # NativeWind + Reanimated
│   ├── tailwind.config.js
│   └── package.json        # Expo 52, RN 0.76.3, all deps listed
│
├── api/                    # FastAPI main API (Railway)
│   └── main.py             # /templates, /parametric, /generate, /job/:id, /designs
│
├── cad-worker/             # FastAPI CAD execution worker (Docker + gVisor)
│   ├── main.py             # 3-layer sandbox: AST lint → subprocess → cgroups
│   ├── validation.py       # trimesh geometric analysis — manifold, wall thickness,
│   │                       # overhang, bed fit, unit sanity
│   ├── requirements.txt    # includes trimesh, numpy, scipy
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── templates/              # build123d parametric templates
│   ├── template_simple_box.py
│   ├── template_phone_stand.py
│   ├── template_cable_box.py
│   ├── template_wall_hook.py
│   └── template_name_plate.py
│
├── supabase/migrations/    # Postgres schema
│   ├── 001_initial_schema.sql  # profiles, designs, generation_jobs,
│   │                           # moderation_log, agent tables, kpi_snapshot view
│   └── 002_waitlist.sql
│
└── docs/
    └── formforge-launch-plan-v2.html  # full product plan reference
```

---

## Running locally

### iOS simulator (mock mode — no backend needed)

```bash
# 1. Create env file (gitignored)
cat > formforge-app/.env.local << 'EOF'
EXPO_PUBLIC_MOCK_CAD=true
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_CAD_WORKER_URL=http://localhost:8001
EXPO_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key
EOF

# 2. Install and start
cd formforge-app
npm install
npx expo start --ios
```

Mock mode (`EXPO_PUBLIC_MOCK_CAD=true`) returns realistic fake responses (300–900ms delay, wall thickness validation, bed fit for 4 printers) without any running backend. Export buttons alert "demo mode" instead of crashing on mock:// URLs.

### Full stack (real CAD worker)

```bash
# Start API + CAD worker together
cd api
cp .env.example .env  # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
docker compose up     # spins up api:8000 + cad-worker:8001

# Then start app pointing at real backend
EXPO_PUBLIC_MOCK_CAD=false \
EXPO_PUBLIC_API_URL=http://localhost:8000 \
npx expo start --ios
```

### Tests

```bash
cd formforge-app
npm test              # runs jest-expo
npm test -- --coverage
```

---

## Architecture decisions (don't change without reason)

| Decision | Rationale |
|---|---|
| **Zustand over Redux** | Simpler for 2 small stores; no boilerplate |
| **Debounce 500ms on param change** | Prevents hammering CAD worker on slider drag |
| **Mock mode via env var** | Lets the app run in simulator/CI without any backend |
| **print_report replaces validation** | Old `ValidationResult` was param-only; `PrintReport` is geometric |
| **gVisor at host, not Dockerfile** | Runtime isolation set at Docker daemon level on Railway |
| **RestrictedPython as lint only** | It is NOT the sandbox — gVisor is. RestrictedPython is a pre-execution AST gate |
| **trimesh ray-cast for wall thickness** | 5th-percentile of 500 inward ray hits — fast enough (<100ms) and reliable |
| **3MF over STL as preferred export** | 3MF includes units (mm) explicitly; STL is unitless |

---

## Design tokens (exact — do not drift)

```typescript
bg: '#060a10'     surface: '#0c1420'   surface2: '#101c2e'
border: '#182035' accent: '#3d9bff'    teal: '#00e5cc'
orange: '#ff6b35' muted: '#48587a'     text: '#c4d0ec'
hl: '#eef2ff'     red: '#f87171'       gold: '#f5c542'
green: '#4ade80'
```

All in `formforge-app/constants/tokens.ts`. Always import from there — never hardcode hex values in components.

---

## Subscription tiers

| Tier | Templates | Generations | STEP export | Saves |
|---|---|---|---|---|
| **Free** | ✓ (free-flagged only) | 0 (templates only) | — | 3 |
| **Pro** ($9/mo) | ✓ all | 5/mo | — | unlimited |
| **Studio** ($24/mo) | ✓ all | unlimited* | ✓ | unlimited |

*Studio "unlimited" has a 50 gen/mo soft cap to prevent CAD worker runaway.

`free: false` on a template → gate with `useTierGate('pro')` from `lib/entitlements.ts`.
UpgradePrompt bottom sheet is in `components/UpgradePrompt.tsx`.

---

## What to build next (priority order)

### 1. RevenueCat paywall — wire it into Browse screen
- `useRevenueCat()` is already initialized in `lib/entitlements.ts` but not called anywhere
- Call it in `app/_layout.tsx` after auth init
- In `app/(tabs)/index.tsx`, wrap the `handleSelect` call: if template is `free: false` and `!useTierGate('pro')`, show `UpgradePrompt` instead of navigating to editor
- RevenueCat API key goes in `.env` as `EXPO_PUBLIC_REVENUECAT_API_KEY`

### 2. Real 3D preview — replace the ⬡ placeholder
- `components/Preview3D.tsx` is currently a typed stub
- Wire in `expo-gl` + `@react-three/fiber` with a `Canvas` backed by `GLView`
- Load the GLB URL from `lastGeneration.glb_url` via `useLoader(GLTFLoader, url)`
- Add `OrbitControls` so users can rotate
- Only render when `glbUrl` is a real `http://` URL (not `mock://`)
- Keep the ⬡ placeholder for mock mode

### 3. Printer profile selector — persist user's printer choice
- Add to Account tab: "My Printer" picker using `PRINTER_PROFILES` from `lib/printers.ts`
- Persist via `AsyncStorage` key `'user_printer'`
- Pass selected printer ID to `PrintReadinessReport` so bed-fit highlights the user's printer first

### 4. More templates (target: 20 by TestFlight)
- Create `templates/template_planter.py` — cylindrical plant pot with drainage hole
- Create `templates/template_drawer_organizer.py` — configurable grid divider tray
- Create `templates/template_keychain.py` — flat keychain with text emboss and key ring hole
- Create `templates/template_monitor_riser.py` — desk monitor riser with cable management slot
- Each must follow the same pattern: `PARAMS` dict, `METADATA` dict, `generate(params) -> Shape`
- Add each to `formforge-app/data/templates.json` with `print_hints`

### 5. TestFlight prep
- App icon: 1024×1024 PNG at `formforge-app/assets/icon.png` (currently missing)
- Splash screen: 1284×2778 PNG at `formforge-app/assets/splash.png` (currently missing)
- `eas.json` config for EAS Build
- `app.json` already has `bundleIdentifier: "com.formforge.app"` and `usesAppleSignIn: true`
- Run `npx eas build --platform ios --profile preview` for TestFlight build

### 6. Text emboss — complete the name_plate UX
- `template_name_plate.py` already does text emboss via build123d `Text()`
- The `text_content` param in `ParameterEditor` renders a `TextInput`
- Need: live preview update on text change (currently debounced like other params — this is fine)
- Need: character limit warning in UI when approaching 12 chars (text gets too small)

---

## Supabase tables (already migrated)

```sql
profiles          -- auto-created on signup, stores tier
designs           -- user saved designs (user_id, template_id, params, stl_url)
generation_jobs   -- async AI generation queue (status: queued→generating→ready)
moderation_log    -- OpenAI moderation results for all prompts
agent_decisions   -- AI C-Suite daily outputs
agent_escalations -- items requiring human review
dmca_queue        -- IP/DMCA reports on community templates
waitlist          -- pre-launch email capture
```

`kpi_snapshot` view: single source of truth for all agent KPI queries.

Run migrations: `supabase db push` from repo root (requires Supabase CLI + linked project).

---

## CAD worker validation output shape

Every `/parametric` response includes a `print_report`:

```typescript
{
  is_printable: boolean,
  errors:   PrintIssue[],   // severity: 'error'
  warnings: PrintIssue[],   // severity: 'warning'
  info:     PrintIssue[],   // severity: 'info' (e.g. PRINT_READY)
  dimensions: { x, y, z, volume_cm3, surface_area_cm2 },
  bed_fit: { [printerId]: { fits: boolean, margin_x, margin_y, margin_z } },
  estimated_support_needed: boolean,
  wall_thickness_min_mm: number | null,  // 5th percentile ray-cast
  overhang_fraction: number,             // fraction of surface area >45°
}
```

---

## Key env vars

| Var | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_MOCK_CAD` | app `.env.local` | `true` = offline simulator mode |
| `EXPO_PUBLIC_SUPABASE_URL` | app | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app | Supabase anon key (safe to expose) |
| `EXPO_PUBLIC_API_URL` | app | FormForge API base URL |
| `EXPO_PUBLIC_CAD_WORKER_URL` | app | CAD worker base URL (dev only; prod routes through API) |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | app | RevenueCat iOS public key |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | app | PostHog project key |
| `SUPABASE_URL` | api/.env | Same Supabase URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | api/.env | Supabase service role (never expose) |
| `OPENAI_API_KEY` | api/.env | For prompt moderation before AI generation queue |
| `FILE_BASE_URL` | cad-worker | Base URL for STL/GLB/3MF file links (Cloudflare R2) |

---

## Commit convention

```
FormForge <scope>: <what changed>

<body explaining why, not what>

https://claude.ai/code/session_01Pt4f6KdpDsTKVKPec5dBrS
```

Always push to `claude/formforge-launch-plan-v2-5ms83o` — never to `main` directly.
