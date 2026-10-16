import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SEARCH_MAX_LENGTH } from './list-search';

const DEBOUNCE_MS = 300;

export function WebhookSearchInput() {
  const { page, search } = useSearch({ from: '/_protected/webhooks' });
  const navigate = useNavigate({ from: '/webhooks' });
  const [draft, setDraft] = useState(search);
  const [synced, setSynced] = useState({ page, search });
  const [sent, setSent] = useState<readonly string[]>([]);

  if (page !== synced.page || search !== synced.search) {
    setSynced({ page, search });
    const ownIndex = search === synced.search ? -1 : sent.indexOf(search);
    if (ownIndex === -1) {
      setDraft(search);
      setSent([]);
    } else {
      setSent(sent.slice(ownIndex + 1));
    }
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === search) return;
    const timer = setTimeout(() => {
      setSent((prev) => [...prev, next]);
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
        maxLength={SEARCH_MAX_LENGTH}
        autoComplete="off"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
    </div>
  );
}
