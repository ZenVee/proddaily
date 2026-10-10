import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { parseWordList, wordleService } from '@/services/wordleService';
import { useToast } from '@/state/ToastContext';

const PAGE_SIZE = 40;

interface Props {
  canEdit: boolean;
}

export function WordleWordList({ canEdit }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState('');
  const [bulkDraft, setBulkDraft] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    wordleService.searchAllowedWords(query, PAGE_SIZE, page * PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setWords(result.words);
        setTotal(result.total);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast(err instanceof Error ? err.message : 'Failed to load words', 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [query, page, toast, busy]);

  async function addWord() {
    const word = draft.toUpperCase().trim();
    if (!/^[A-Z]{5}$/.test(word)) {
      toast('Word must be 5 letters.', 'warning');
      return;
    }
    setBusy(true);
    try {
      await wordleService.addAllowedWord(word);
      setDraft('');
      setQuery(word);
      setPage(0);
      toast(`${word} added.`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Add failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function addWordList() {
    const parsed = parseWordList(bulkDraft);
    if (parsed.length === 0) {
      toast('Paste one or more 5-letter words.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const result = await wordleService.addAllowedWords(parsed);
      setBulkDraft('');
      setShowBulk(false);
      setPage(0);
      const parts = [
        `${result.added} added`,
        result.skipped > 0 ? `${result.skipped} already present` : null,
        result.invalid > 0 ? `${result.invalid} invalid` : null,
      ].filter(Boolean);
      toast(parts.join(' · '), result.added > 0 ? 'success' : 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk add failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeWord(word: string) {
    setBusy(true);
    try {
      await wordleService.removeAllowedWord(word);
      toast(`${word} removed.`, 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Remove failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const bulkPreview = parseWordList(bulkDraft).length;

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          label="Search"
          value={query}
          placeholder="CRAN"
          onChange={(e) => {
            setPage(0);
            setQuery(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''));
          }}
        />
        {canEdit && (
          <div className="flex items-end gap-2">
            <Input
              label="Add word"
              value={draft}
              maxLength={5}
              placeholder="CRANE"
              onChange={(e) => setDraft(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            />
            <Button disabled={busy} onClick={() => void addWord()}>Add</Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setShowBulk((v) => !v)}
            >
              {showBulk ? 'Hide list' : 'Add list'}
            </Button>
          </div>
        )}
      </div>

      {canEdit && showBulk && (
        <div className="mb-4 space-y-3 border border-proddaily-border rounded-street p-4 bg-proddaily-bg-2">
          <Textarea
            label="Paste words"
            value={bulkDraft}
            rows={6}
            placeholder={'CRANE\nSLATE\nTRACE\nor comma / space separated'}
            onChange={(e) => setBulkDraft(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-proddaily-text-2">
              {bulkPreview} unique token{bulkPreview === 1 ? '' : 's'} detected · max 5000
            </p>
            <Button disabled={busy || bulkPreview === 0} onClick={() => void addWordList()}>
              Add list
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-proddaily-text-2 mb-3">{total} words · showing {from}–{to}</p>

      {words.length === 0 ? (
        <p className="text-sm text-proddaily-text-2 py-6">No matching words.</p>
      ) : (
        <ul className="divide-y divide-proddaily-border border border-proddaily-border rounded-street">
          {words.map((word) => (
            <li key={word} className="flex items-center justify-between px-3 py-2">
              <span className="font-mono tracking-widest text-proddaily-text">{word}</span>
              {canEdit && (
                <Button size="sm" variant="danger" disabled={busy} onClick={() => void removeWord(word)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </Card>
  );
}
