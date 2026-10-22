import { Download, Github, LogOut, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Dialog } from '../components/Dialog.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { Avatar, Button, Card, Field, Input, PageHeader, Segmented } from '../components/ui.tsx';
import { del } from '../lib/api.ts';
import { displayName, useAuth } from '../lib/auth.tsx';
import { formatDate } from '../lib/format.ts';
import { getCollection, listCollections, listSearches } from '../lib/library.ts';
import { invalidate } from '../lib/query.ts';
import { useRouter } from '../lib/router.tsx';
import { useTheme, type ThemePreference } from '../lib/theme.tsx';
import { useToast } from '../lib/toast.tsx';

const STACKS = ['Next.js + TypeScript + Tailwind', 'React + Vite + TypeScript', 'Python + FastAPI', 'Rust', 'Go', 'SvelteKit + TypeScript', 'React Native + Expo'];

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-border py-8 first:pt-0 last:border-0 md:grid-cols-3 md:gap-10">
      <div>
        <h2 className="font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-[13px] text-fg-muted">{description}</p>
      </div>
      <div className="md:col-span-2">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  return (
    <RequireAuth title="Settings" description="Manage your profile and preferences.">
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const { navigate } = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const save = async (field: string, patch: Parameters<typeof updateProfile>[0]) => {
    setSaving(field);
    try {
      await updateProfile(patch);
      toast({ tone: 'success', title: 'Saved' });
    } catch (err) {
      toast({ tone: 'error', title: 'Could not save', description: (err as Error).message });
    } finally {
      setSaving(null);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const collections = await listCollections();
      const full = await Promise.all(collections.map((c) => getCollection(c.id)));
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, collections: full, searches: await listSearches(1000) }, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `replex-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast({ tone: 'error', title: 'Export failed', description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const avatar = profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined);

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, appearance and data." />
      <Card className="px-6 py-8">
        <Section title="Profile" description="Synced from GitHub when you sign in. Your display name can be changed.">
          <div className="flex items-center gap-4">
            <Avatar src={avatar} alt="" size={56} />
            <div>
              <p className="font-medium text-fg">{displayName(user, profile)}</p>
              {profile?.github_login && (
                <a href={`https://github.com/${profile.github_login}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg">
                  <Github className="size-3.5" aria-hidden />@{profile.github_login}
                </a>
              )}
              {profile?.created_at && <p className="text-[12px] text-fg-subtle">Member since {formatDate(profile.created_at)}</p>}
            </div>
          </div>
          <form
            className="mt-6 flex max-w-md items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = String(new FormData(e.currentTarget).get('display_name') || '').trim();
              void save('name', { display_name: v || null });
            }}
          >
            <div className="flex-1">
              <Field label="Display name" htmlFor="display-name">
                <Input id="display-name" name="display_name" defaultValue={profile?.display_name ?? ''} maxLength={80} autoComplete="name" />
              </Field>
            </div>
            <Button type="submit" loading={saving === 'name'}>
              Save
            </Button>
          </form>
        </Section>

        <Section title="Appearance" description="Follows your device by default. Saved to your account so it travels with you.">
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <span className="text-[13px] font-medium" id="theme-label">
                Theme
              </span>
              <Segmented<ThemePreference>
                label="Theme"
                value={preference}
                onChange={setPreference}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <label className="flex max-w-md items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--accent)]"
                checked={profile?.reduced_motion ?? false}
                onChange={(e) => void save('motion', { reduced_motion: e.target.checked })}
              />
              <span>
                <span className="block text-[13px] font-medium text-fg">Reduce motion</span>
                <span className="block text-[13px] text-fg-muted">Replace slides and springs with simple fades, even if your device allows motion.</span>
              </span>
            </label>
          </div>
        </Section>

        <Section title="Your stack" description="Used to score compatibility on repository pages and by your agents when they don’t specify one.">
          <form
            className="flex max-w-md items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = String(new FormData(e.currentTarget).get('stack') || '').trim();
              if (v) void save('stack', { target_stack: v }).then(() => invalidate('repo:'));
            }}
          >
            <div className="flex-1">
              <Field label="Target stack" htmlFor="target-stack" hint="e.g. Next.js + TypeScript + Tailwind">
                <Input id="target-stack" name="stack" defaultValue={profile?.target_stack} list="stack-options" maxLength={200} autoComplete="off" />
              </Field>
              <datalist id="stack-options">
                {STACKS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <Button type="submit" loading={saving === 'stack'} className="mb-[22px]">
              Save
            </Button>
          </form>
        </Section>

        <Section title="Your data" description="Download everything Replex stores for you, or delete it.">
          <div className="flex flex-wrap gap-2">
            <Button icon={<Download className="size-4" aria-hidden />} loading={exporting} onClick={exportData}>
              Export as JSON
            </Button>
            <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirmDelete(true)}>
              Delete my Replex data
            </Button>
          </div>
          <p className="mt-3 max-w-lg text-[13px] text-fg-subtle">
            Deleting removes your collections, history, API keys and agent activity from Replex. Your sign-in identity is shared with your other apps, so it is kept.
          </p>
        </Section>

        <Section title="Session" description="Sign out of Replex on this device.">
          <Button icon={<LogOut className="size-4" aria-hidden />} onClick={() => void signOut().then(() => navigate('/'))}>
            Sign out
          </Button>
        </Section>
      </Card>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete all of your Replex data?"
        description="Collections, notes, search history, API keys and agent activity are permanently deleted. Agents using your keys stop working."
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await del('/api/v1/me/data');
                  invalidate('');
                  await signOut();
                  navigate('/');
                  toast({ tone: 'success', title: 'Your Replex data was deleted' });
                } catch (err) {
                  toast({ tone: 'error', title: 'Could not delete data', description: (err as Error).message });
                  setDeleting(false);
                }
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">Consider exporting first — this can’t be undone.</p>
      </Dialog>
    </>
  );
}
