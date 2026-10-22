import { ArrowLeft, ExternalLink, Library, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../components/Dialog.tsx';
import { Menu } from '../components/Menu.tsx';
import { LanguageDot, repoPath, Stars } from '../components/repo.tsx';
import { RequireAuth } from '../components/RequireAuth.tsx';
import { Badge, Button, Card, EmptyState, ErrorState, Field, IconButton, Input, PageHeader, Skeleton, Textarea } from '../components/ui.tsx';
import { timeAgo } from '../lib/format.ts';
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeFromCollection,
  updateCollection,
  updateItemNotes,
  type CollectionSummary,
} from '../lib/library.ts';
import { invalidate, useQuery } from '../lib/query.ts';
import { Link, useRouter } from '../lib/router.tsx';
import { useToast } from '../lib/toast.tsx';

function CollectionForm({
  open,
  onClose,
  initial,
  onSubmit,
  title,
  submitLabel,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { name: string; description: string };
  onSubmit: (v: { name: string; description: string }) => Promise<void>;
  title: string;
  submitLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '').trim();
    if (!name) {
      setError('Give the collection a name');
      (e.currentTarget.elements.namedItem('name') as HTMLInputElement).focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ name, description: String(form.get('description') || '').trim() });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <form id="collection-form" onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Name" htmlFor="col-name" error={error}>
          <Input id="col-name" name="name" defaultValue={initial?.name} maxLength={120} autoComplete="off" aria-invalid={Boolean(error)} data-autofocus />
        </Field>
        <Field label="Description" htmlFor="col-desc" hint="Optional — what ties these repositories together?">
          <Textarea id="col-desc" name="description" defaultValue={initial?.description} maxLength={1000} rows={3} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function LibraryPage() {
  return (
    <RequireAuth title="Collections" description="Group repositories into collections your agents can read and add to.">
      <CollectionsList />
    </RequireAuth>
  );
}

function CollectionsList() {
  const { navigate } = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const { data, error, loading, refetch } = useQuery<CollectionSummary[]>('collections', listCollections, 10_000);

  return (
    <>
      <PageHeader
        title="Collections"
        description="Group repositories into collections your agents can read and add to."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)}>
            New collection
          </Button>
        }
      />
      {error && <ErrorState message={error.message} onRetry={refetch} />}
      {loading && !data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}
      {data?.length === 0 && (
        <EmptyState
          icon={<Library className="size-5" aria-hidden />}
          title="No collections yet"
          description="Save repositories from Discover or Search, or ask your agent to save them for you over MCP."
          action={
            <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)}>
              Create your first collection
            </Button>
          }
        />
      )}
      {data && data.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.id}>
              <Card className="group relative flex h-full flex-col p-4 transition-colors hover:border-border-strong">
                <h2 className="text-[15px] font-semibold">
                  <Link to={`/library/${c.id}`} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring">
                    {c.name}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-2 min-h-10 text-fg-muted">{c.description || 'No description'}</p>
                <div className="mt-4 flex items-center gap-3 text-[13px] text-fg-subtle">
                  <span className="tabular">
                    {c.item_count} {c.item_count === 1 ? 'repository' : 'repositories'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>Updated {timeAgo(c.updated_at)}</span>
                  {c.is_private && <Lock className="ml-auto size-3.5" aria-label="Private" />}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <CollectionForm
        open={creating}
        onClose={() => setCreating(false)}
        title="New collection"
        submitLabel="Create collection"
        onSubmit={async (v) => {
          const col = await createCollection(v.name, v.description);
          invalidate('collections');
          toast({ tone: 'success', title: `Created ${col.name}` });
          navigate(`/library/${col.id}`);
        }}
      />
    </>
  );
}

export function CollectionPage({ id }: { id: string }) {
  return (
    <RequireAuth title="Collection" description="Sign in to open this collection.">
      <CollectionDetail id={id} />
    </RequireAuth>
  );
}

function CollectionDetail({ id }: { id: string }) {
  const { navigate } = useRouter();
  const toast = useToast();
  const { data, error, loading, refetch } = useQuery(`collection:${id}`, () => getCollection(id), 5_000);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notesFor, setNotesFor] = useState<{ name: string; notes: string } | null>(null);

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (loading && !data) return <Skeleton className="h-64" />;
  if (!data) {
    return <EmptyState icon={<Library className="size-5" aria-hidden />} title="Collection not found" description="It may have been deleted." action={<Link to="/library" className="text-link hover:underline">Back to collections</Link>} />;
  }

  return (
    <>
      <Link to="/library" className="-ml-1.5 inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-[13px] text-fg-muted hover:bg-muted hover:text-fg">
        <ArrowLeft className="size-3.5" aria-hidden /> Collections
      </Link>
      <div className="mt-4">
        <PageHeader
          title={data.name}
          description={data.description || undefined}
          actions={
            <Menu
              items={[
                { label: 'Rename / edit', icon: <Pencil />, onSelect: () => setEditing(true) },
                { label: 'Delete collection', icon: <Trash2 />, danger: true, onSelect: () => setConfirmDelete(true) },
              ]}
              trigger={(p) => (
                <IconButton label="Collection actions" variant="secondary" onClick={p.toggle} id={p.id} aria-expanded={p['aria-expanded']} aria-haspopup="menu">
                  <MoreHorizontal className="size-4" aria-hidden />
                </IconButton>
              )}
            />
          }
        />
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<Library className="size-5" aria-hidden />}
          title="This collection is empty"
          description="Use the bookmark button on any repository to add it here."
          action={
            <Link to="/discover" className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-sm font-medium text-primary-fg hover:opacity-90">
              Find repositories
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.repo_full_name} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <Link to={repoPath(item.repo_full_name)} className="font-semibold text-fg hover:underline" translate="no">
                    {item.repo_full_name}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-fg-muted">{item.repo_snapshot.description || 'No description'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                    <LanguageDot language={item.repo_snapshot.language} />
                    {typeof item.repo_snapshot.stars === 'number' && <Stars count={item.repo_snapshot.stars} />}
                    {item.repo_snapshot.category && <Badge>{item.repo_snapshot.category.replace(' / Unclassified', '')}</Badge>}
                    <span className="text-fg-subtle">Saved {timeAgo(item.added_at)}</span>
                  </div>
                  {item.notes && <p className="mt-2 rounded-sm border-l-2 border-accent bg-muted/50 px-3 py-1.5 text-[13px] text-fg">{item.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" aria-hidden />} onClick={() => setNotesFor({ name: item.repo_full_name, notes: item.notes })}>
                    {item.notes ? 'Edit note' : 'Add note'}
                  </Button>
                  <IconButton size="sm" label={`Open ${item.repo_full_name} on GitHub`} onClick={() => window.open(`https://github.com/${item.repo_full_name}`, '_blank', 'noopener')}>
                    <ExternalLink className="size-3.5" aria-hidden />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={`Remove ${item.repo_full_name} from this collection`}
                    onClick={async () => {
                      try {
                        await removeFromCollection(id, item.repo_full_name);
                        invalidate(`collection:${id}`);
                        invalidate('collections');
                        invalidate(`containing:${item.repo_full_name}`);
                        toast({ tone: 'success', title: 'Removed', description: item.repo_full_name });
                      } catch (err) {
                        toast({ tone: 'error', title: 'Could not remove', description: (err as Error).message });
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <CollectionForm
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit collection"
        submitLabel="Save changes"
        initial={{ name: data.name, description: data.description }}
        onSubmit={async (v) => {
          await updateCollection(id, v);
          invalidate(`collection:${id}`);
          invalidate('collections');
        }}
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${data.name}”?`}
        description="The collection and its notes are deleted. The repositories themselves are not affected."
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
                  await deleteCollection(id);
                  invalidate('collections');
                  toast({ tone: 'success', title: `Deleted ${data.name}` });
                  navigate('/library');
                } catch (err) {
                  toast({ tone: 'error', title: 'Could not delete', description: (err as Error).message });
                  setDeleting(false);
                }
              }}
            >
              Delete collection
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">
          {data.items.length} saved {data.items.length === 1 ? 'repository' : 'repositories'} will be removed from this collection.
        </p>
      </Dialog>

      <NotesDialog collectionId={id} target={notesFor} onClose={() => setNotesFor(null)} />
    </>
  );
}

function NotesDialog({ collectionId, target, onClose }: { collectionId: string; target: { name: string; notes: string } | null; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={Boolean(target)} onClose={onClose} title="Note" description={target ? <span translate="no">{target.name}</span> : undefined} size="sm">
      {target && (
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await updateItemNotes(collectionId, target.name, String(new FormData(e.currentTarget).get('notes') || ''));
              invalidate(`collection:${collectionId}`);
              onClose();
            } catch (err) {
              toast({ tone: 'error', title: 'Could not save note', description: (err as Error).message });
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="item-notes" className="sr-only">
            Note
          </label>
          <Textarea id="item-notes" name="notes" defaultValue={target.notes} rows={4} maxLength={2000} placeholder="Why is this repository here?" data-autofocus />
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>
              Save note
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
