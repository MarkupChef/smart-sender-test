import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const DEBOUNCE_MS = 300;

export function WebhookSearchInput() {
  const { search } = useSearch({ from: '/_protected/webhooks' });
  const navigate = useNavigate({ from: '/webhooks' });
  const [draft, setDraft] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);

  if (search !== syncedSearch) {
    setSyncedSearch(search);
    if (search !== draft.trim()) setDraft(search);
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === search) return;
    const timer = setTimeout(() => {
      void navigate({ search: { search: next, page: 1 }, replace: true });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, search, navigate]);

  return (
    <div className="grid max-w-sm gap-1.5">
      <Label htmlFor="webhook-search">Search by name</Label>
      <Input
        id="webhook-search"
        type="search"
        maxLength={100}
        autoComplete="off"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
    </div>
  );
}
