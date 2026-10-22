import { Activity, Bot, CircleCheck, CircleX, KeyRound, Plus, ShieldAlert, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../components/Dialog.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { Badge, Button, Card, CodeBlock, cn, CopyButton, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton } from '../components/ui.tsx';
import { api, del, post } from '../lib/api.ts';
import { timeAgo } from '../lib/format.ts';
import { listAgentEvents, listKeys, type AgentEvent, type ApiKeyRecord } from '../lib/library.ts';
import { invalidate, useQuery } from '../lib/query.ts';
import { useToast } from '../lib/toast.tsx';

interface ToolInfo {
  name: string;
  title: string;
  description: string;
}

const CLIENTS = ['Claude Code', 'Claude Desktop', 'Cursor', 'VS Code', 'HTTP'] as const;
type Client = (typeof CLIENTS)[number];

function snippet(client: Client, url: string, key: string): { code: string; where: string } {
  switch (client) {
    case 'Claude Code':
      return { where: 'Run in your terminal', code: `claude mcp add --transport http replex ${url} \\\n  --header "Authorization: Bearer ${key}"` };
    case 'Claude Desktop':
      return {
        where: 'Settings → Developer → Edit config (claude_desktop_config.json)',
        code: JSON.stringify(
          {
            mcpServers: {
              replex: {
                command: 'npx',
                args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${REPLEX_AUTH}'],
                env: { REPLEX_AUTH: `Bearer ${key}` },
              },
            },
          },
          null,
          2,
        ),
      };
    case 'Cursor':
      return {
        where: '~/.cursor/mcp.json',
        code: JSON.stringify({ mcpServers: { replex: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2),
      };
    case 'VS Code':
      return {
        where: '.vscode/mcp.json — VS Code prompts for the key and stores it securely',
        code: JSON.stringify(
          {
            servers: { replex: { type: 'http', url, headers: { Authorization: 'Bearer ${input:replex-key}' } } },
            inputs: [{ type: 'promptString', id: 'replex-key', description: 'Replex API key', password: true }],
          },
          null,
          2,
        ),
      };
    case 'HTTP':
      return {
        where: 'Test from any terminal',
        code: `curl ${url} \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"trending_repositories","arguments":{"window":"week"}}}'`,
      };
  }
}

export function AgentsPage() {
  return (
    <RequireAuth title="Agents & MCP" description="Give Claude, Cursor and any MCP client a private line into Replex and your library.">
      <Agents />
    </RequireAuth>
  );
}

function Agents() {
  const toast = useToast();
  const keys = useQuery<ApiKeyRecord[]>('keys', listKeys, 10_000);
  const events = useQuery<AgentEvent[]>('agent-events', () => listAgentEvents(30), 10_000);
  const tools = useQuery<{ tools: ToolInfo[] }>('mcp-tools', () => api('/api/v1/mcp/tools'), 60 * 60_000);
  const [client, setClient] = useState<Client>('Claude Code');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const url = `${window.location.origin}/api/mcp`;
  const active = keys.data?.filter((k) => !k.revoked_at) ?? [];
  const keyNames = new Map((keys.data ?? []).map((k) => [k.id, k.name]));
  const shown = snippet(client, url, newKey ?? 'rpx_YOUR_KEY');

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
        description="Give Claude, Cursor and any MCP client a private line into Replex. Agents search GitHub on your quota and read and write your collections — nobody else’s."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)}>
            New API key
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

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bot className="size-4 text-fg-subtle" aria-hidden /> Connect a client
              </h2>
              <Badge tone="success">
                <span className="size-1.5 rounded-full bg-success" aria-hidden /> MCP server live
              </Badge>
            </div>
            <div className="px-5 pt-4">
              <div role="tablist" aria-label="MCP client" className="-mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {CLIENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    id={`tab-${c}`}
                    aria-selected={client === c}
                    aria-controls="client-panel"
                    onClick={() => setClient(c)}
                    className={cn(
                      'h-8 shrink-0 rounded-sm px-3 text-[13px] font-medium pointer-coarse:h-11',
                      client === c ? 'bg-muted text-fg' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div id="client-panel" role="tabpanel" aria-labelledby={`tab-${client}`} className="px-5 pb-5 pt-3">
              <p className="mb-2 text-[13px] text-fg-muted">{shown.where}</p>
              <CodeBlock code={shown.code} />
              <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <dt className="text-fg-subtle">Endpoint</dt>
                  <dd className="min-w-0 flex-1 truncate font-mono text-[12px]" translate="no">
                    {url}
                  </dd>
                  <CopyButton value={url} label="Copy" />
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <dt className="text-fg-subtle">Transport</dt>
                  <dd className="text-fg">Streamable HTTP · Bearer key</dd>
                </div>
              </dl>
            </div>
          </Card>

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
            {events.data?.length === 0 && <p className="px-5 py-6 text-center text-fg-muted">No calls yet. Connect a client and ask it to search Replex.</p>}
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

      <Dialog open={creating} onClose={() => setCreating(false)} title="New API key" description="Name it after the agent or machine that will use it." size="sm">
        <form onSubmit={create} className="grid gap-4">
          <Field label="Key name" htmlFor="key-name" hint="e.g. “Claude Code — laptop”">
            <Input id="key-name" name="name" maxLength={80} autoComplete="off" required data-autofocus />
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
