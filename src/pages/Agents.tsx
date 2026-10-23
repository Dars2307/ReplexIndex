import { Activity, Bot, CircleCheck, CircleX, KeyRound, Plus, ShieldAlert, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../components/Dialog.tsx';
import { InstallCheck } from '../components/InstallCheck.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { Badge, Button, Card, CodeBlock, cn, CopyButton, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton } from '../components/ui.tsx';
import { api, del, post } from '../lib/api.ts';
import { timeAgo } from '../lib/format.ts';
import { listAgentEvents, listKeys, type AgentEvent, type ApiKeyRecord } from '../lib/library.ts';
import { invalidate, useQuery } from '../lib/query.ts';
import { MCP_CLIENTS } from '../lib/mcpClients.ts';
import { useSearchParams } from '../lib/router.tsx';
import { useToast } from '../lib/toast.tsx';

interface ToolInfo {
  name: string;
  title: string;
  description: string;
}

export function AgentsPage() {
  return (
    <RequireAuth title="Agents & MCP" description="Connect Claude, Codex, Cursor and other agents to Replex with read-only access.">
      <Agents />
    </RequireAuth>
  );
}

function Agents() {
  const toast = useToast();
  const keys = useQuery<ApiKeyRecord[]>('keys', listKeys, 10_000);
  const events = useQuery<AgentEvent[]>('agent-events', () => listAgentEvents(30), 10_000);
  const tools = useQuery<{ tools: ToolInfo[] }>('mcp-tools', () => api('/api/v1/mcp/tools'), 60 * 60_000);
  const [params, setParams] = useSearchParams();
  const client = MCP_CLIENTS.find((c) => c.id === params.get('client')) ?? MCP_CLIENTS.find((c) => c.id === 'claude-code')!;
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const url = `${window.location.origin}/api/mcp`;
  const active = keys.data?.filter((k) => !k.revoked_at) ?? [];
  const keyNames = new Map((keys.data ?? []).map((k) => [k.id, k.name]));
  const key = newKey ?? 'rpx_YOUR_KEY';
  const header = `Authorization: Bearer ${key}`;

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name') || '').trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await post<{ key: string }>('/api/v1/me/keys', { name });
      setNewKey(res.key);
      setCreating(false);
      invalidate('keys');
    } catch (err) {
      toast({ tone: 'error', title: 'Could not create key', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await del(`/api/v1/me/keys/${revoking.id}`);
      invalidate('keys');
      toast({ tone: 'success', title: `Revoked ${revoking.name}`, description: 'Agents using this key lose access immediately.' });
      setRevoking(null);
    } catch (err) {
      toast({ tone: 'error', title: 'Could not revoke key', description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Agents & MCP"
        description="Connect an agent to Replex with its own API key. Agents search GitHub on your quota and read your collections and history. Access is read-only: they can’t change your library or any repository."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)}>
            New key for {client.name}
          </Button>
        }
      />

      {newKey && (
        <Card className="mb-6 border-accent/40 p-5" role="status">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Copy your new key now</h2>
              <p className="mt-0.5 text-fg-muted">For your security Replex only stores a hash — this is the only time the full key is shown. It’s already filled into the setup snippet below.</p>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[13px]" translate="no">
                  {newKey}
                </code>
                <CopyButton value={newKey} label="Copy key" />
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bot className="size-4 text-fg-subtle" aria-hidden /> Connect an agent
              </h2>
              <Badge tone="success">
                <span className="size-1.5 rounded-full bg-success" aria-hidden /> Read-only
              </Badge>
            </div>
            <div className="px-5 pt-4 sm:hidden">
              <label htmlFor="mcp-client" className="mb-1.5 block text-[12px] font-medium text-fg-subtle">
                Your agent
              </label>
              <select
                id="mcp-client"
                value={client.id}
                onChange={(e) => setParams({ client: e.target.value })}
                className="h-11 w-full rounded-sm border border-input bg-surface px-3 text-fg"
              >
                {MCP_CLIENTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div role="radiogroup" aria-label="Agent" className="hidden flex-wrap gap-1.5 px-5 pt-4 sm:flex">
              {MCP_CLIENTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={client.id === c.id}
                  onClick={() => setParams({ client: c.id })}
                  className={cn(
                    'h-7 rounded-full border px-2.5 text-[12.5px] font-medium transition-colors pointer-coarse:h-10 pointer-coarse:px-3.5',
                    client.id === c.id ? 'border-transparent bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="px-5 pb-5 pt-4" aria-live="polite">
              <ol className="mb-4 space-y-1.5 text-[13px] text-fg-muted">
                <li className="flex gap-2">
                  <span className="w-4 shrink-0 font-mono text-fg-subtle">1.</span>
                  <span className="min-w-0">
                    {newKey ? (
                      <>Key created. It’s filled in below.</>
                    ) : (
                      <>
                        <button type="button" onClick={() => setCreating(true)} className="font-medium text-link hover:underline">
                          Create a key for {client.name}
                        </button>{' '}
                        — you name it, it’s tied to your GitHub sign-in, and you can revoke it any time.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="w-4 shrink-0 font-mono text-fg-subtle">2.</span>
                  <span className="min-w-0">
                    Set it up: <span className="text-fg">{client.where}</span>
                  </span>
                </li>
              </ol>
              {client.steps && (
                <ol className="mb-3 space-y-1.5 rounded-md border border-border px-4 py-3 text-[13px] text-fg">
                  {client.steps(url, key).map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-4 shrink-0 font-mono text-fg-subtle">{i + 1}.</span>
                      <span className="min-w-0 break-words">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              <CodeBlock code={client.snippet(url, key)} />
              {client.extra && <CodeBlock className="mt-3" label={client.extra.label} code={client.extra.code(url, key)} />}
              {client.note && <p className="mt-2 text-[12.5px] text-fg-subtle">{client.note}</p>}
              <dl className="mt-4 grid grid-cols-1 gap-2 text-[13px]">
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <dt className="w-24 shrink-0 text-fg-subtle">Server URL</dt>
                  <dd className="min-w-0 flex-1 truncate font-mono text-[12px]" translate="no">
                    {url}
                  </dd>
                  <CopyButton value={url} label="Copy" />
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <dt className="w-24 shrink-0 text-fg-subtle">Auth header</dt>
                  <dd className="min-w-0 flex-1 truncate font-mono text-[12px]" translate="no">
                    {header}
                  </dd>
                  <CopyButton value={header} label="Copy" />
                </div>
              </dl>
            </div>
          </Card>

          <InstallCheck key={client.id === 'cursor' ? 'cursor' : 'claude-code'} initial={client.id === 'cursor' ? 'cursor' : 'claude-code'} origin={window.location.origin} apiKey={key} />

          <Card>
            <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 font-semibold">
              <KeyRound className="size-4 text-fg-subtle" aria-hidden /> API keys
            </h2>
            {keys.error && (
              <div className="p-5">
                <ErrorState message={keys.error.message} onRetry={keys.refetch} />
              </div>
            )}
            {keys.loading && !keys.data && <Skeleton className="m-5 h-24" />}
            {keys.data?.length === 0 && (
              <div className="p-5">
                <EmptyState
                  icon={<KeyRound className="size-5" aria-hidden />}
                  title="No API keys yet"
                  description="Create a key for each agent or machine so you can revoke them independently."
                  action={
                    <Button variant="primary" onClick={() => setCreating(true)} icon={<Plus className="size-4" aria-hidden />}>
                      Create a key
                    </Button>
                  }
                />
              </div>
            )}
            {keys.data && keys.data.length > 0 && (
              <ul className="divide-y divide-border">
                {keys.data.map((k) => (
                  <li key={k.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3', k.revoked_at && 'opacity-60')}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{k.name}</p>
                      <p className="font-mono text-[12px] text-fg-subtle" translate="no">
                        {k.prefix}…
                      </p>
                    </div>
                    <p className="text-[12px] text-fg-subtle">
                      {k.revoked_at ? `Revoked ${timeAgo(k.revoked_at)}` : k.last_used_at ? `Used ${timeAgo(k.last_used_at)}` : 'Never used'}
                    </p>
                    {k.revoked_at ? (
                      <Badge>Revoked</Badge>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => setRevoking(k)}>
                        Revoke
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {active.length > 0 && <p className="border-t border-border px-5 py-2.5 text-[12px] text-fg-subtle">{active.length} of 10 active keys · 60 calls per minute per key</p>}
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 font-semibold">
              <Wrench className="size-4 text-fg-subtle" aria-hidden /> Tools your agents get
            </h2>
            {tools.loading && !tools.data && <Skeleton className="m-5 h-40" />}
            <ul className="divide-y divide-border">
              {tools.data?.tools.map((t) => (
                <li key={t.name} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[12.5px] text-fg" translate="no">
                      {t.name}
                    </code>
                  </div>
                  <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 font-semibold">
              <Activity className="size-4 text-fg-subtle" aria-hidden /> Recent agent activity
            </h2>
            {events.loading && !events.data && <Skeleton className="m-5 h-24" />}
            {events.data?.length === 0 && <p className="px-5 py-6 text-center text-fg-muted">No calls yet. Connect an agent and ask it to search Replex.</p>}
            {events.data && events.data.length > 0 && (
              <ul className="divide-y divide-border">
                {events.data.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                    {e.ok ? <CircleCheck className="size-3.5 shrink-0 text-success" aria-label="Succeeded" /> : <CircleX className="size-3.5 shrink-0 text-danger" aria-label="Failed" />}
                    <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{e.tool ?? e.method}</code>
                    <span className="hidden truncate text-fg-subtle sm:inline">{e.api_key_id ? keyNames.get(e.api_key_id) ?? 'Key' : 'Session'}</span>
                    <span className="tabular text-fg-subtle">{e.duration_ms !== null ? `${e.duration_ms} ms` : ''}</span>
                    <span className="w-20 text-right text-fg-subtle">{timeAgo(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={client.id === 'custom' ? 'New key for a custom agent' : `New key for ${client.name}`}
        description="Name the agent that will use this key. It gets read-only access and is shown only once."
        size="sm"
      >
        <form onSubmit={create} className="grid gap-4">
          <Field label="Agent name" htmlFor="key-name" hint={client.id === 'custom' ? 'e.g. “Design app server”' : `e.g. “${client.keyName} — laptop”`}>
            <Input id="key-name" name="name" key={client.id} defaultValue={client.keyName} maxLength={80} autoComplete="off" required data-autofocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>
              Create key
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title={`Revoke “${revoking?.name}”?`}
        description="Any agent using this key stops working immediately. This can’t be undone."
        size="sm"
        footer={
          <>
            <Button onClick={() => setRevoking(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={revoke}>
              Revoke key
            </Button>
          </>
        }
      >
        <p className="font-mono text-[13px] text-fg-muted" translate="no">
          {revoking?.prefix}…
        </p>
      </Dialog>
    </>
  );
}
