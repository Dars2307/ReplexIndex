import { config } from 'dotenv';

// Local development reads .env.local first; on Vercel, variables come from the
// project settings and these files don't exist.
config({ path: ['.env.local', '.env'], quiet: true });

// Treat template placeholders ("paste-…", "your-…") as unset.
const real = (v?: string) => (v && !/^(paste-|your-|sb_(publishable|secret)_\.\.\.$)/i.test(v.trim()) ? v.trim() : '');

export const env = {
  supabaseUrl: real(process.env.SUPABASE_URL) || real(process.env.VITE_SUPABASE_URL),
  // New-format secret key (sb_secret_…); the legacy service_role JWT also works.
  supabaseServiceKey: real(process.env.SUPABASE_SECRET_KEY) || real(process.env.SUPABASE_SERVICE_ROLE_KEY),
  githubToken: real(process.env.GITHUB_TOKEN),
  tokenEncryptionKey: real(process.env.TOKEN_ENCRYPTION_KEY),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
};

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceKey);
