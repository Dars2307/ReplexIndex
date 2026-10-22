import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';

// Template placeholders ("paste-…", "your-…", "sb_secret_...") count as unset.
const isPlaceholder = (v: string) => /^(paste-|your-)|\.\.\.$/i.test(v.trim());
const real = (v?: string) => (v && v.trim() && !isPlaceholder(v) ? v.trim() : '');

// Local development: .env.local, then .env. Real environment variables (Vercel)
// always win, and a placeholder in one file never hides a real value in the
// other. On Vercel these files don't exist.
// Tests run with NODE_ENV=test and must never pick up real local credentials.
for (const file of process.env.NODE_ENV === 'test' ? [] : ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const [key, value] of Object.entries(parse(readFileSync(file)))) {
    const current = process.env[key];
    if (current === undefined || (isPlaceholder(current) && !isPlaceholder(value))) process.env[key] = value;
  }
}

export const env = {
  supabaseUrl: real(process.env.SUPABASE_URL) || real(process.env.VITE_SUPABASE_URL),
  // New-format secret key (sb_secret_…); the legacy service_role JWT also works.
  supabaseServiceKey: real(process.env.SUPABASE_SECRET_KEY) || real(process.env.SUPABASE_SERVICE_ROLE_KEY),
  githubToken: real(process.env.GITHUB_TOKEN),
  tokenEncryptionKey: real(process.env.TOKEN_ENCRYPTION_KEY),
  geminiKey: real(process.env.GEMINI_API_KEY),
  // Measured on the free tier (Oct 2026): 3.5 Flash ≈2s, 3.5 Flash-Lite ≈6s.
  geminiModel: real(process.env.GEMINI_MODEL) || 'gemini-3.5-flash',
  geminiFallbackModels: (real(process.env.GEMINI_FALLBACK_MODELS) || 'gemini-3-flash-preview,gemini-3.5-flash-lite')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
};

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceKey);
