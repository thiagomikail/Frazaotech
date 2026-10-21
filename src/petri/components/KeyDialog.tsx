import { KeyRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '../strings';
import { keyFingerprint, looksLikeGoogleKey, ownKey, setOwnKey, siteKey } from '../llm/gemini';

export default function KeyDialog({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState(ownKey());
  const hasSite = Boolean(siteKey());
  const hasOwn = Boolean(ownKey());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onPointerDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-title"
        className="w-full max-w-md overflow-hidden rounded-sm border border-line bg-raised shadow-pop"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-9 items-center gap-2 border-b border-line bg-strip pl-3 pr-1">
          <KeyRound size={14} className="shrink-0 text-ink-2" />
          <h2 id="key-title" className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
            {t('key.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('key.close')}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm border border-line bg-raised text-ink-2 transition-colors hover:bg-fill-strong hover:text-ink"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-4">
          <p
            className={`mb-3 flex items-start gap-2 border-l-4 bg-field py-1.5 pl-2.5 pr-2 text-[13px] leading-snug text-ink ${hasSite ? 'border-l-green' : 'border-l-orange'}`}
          >
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${hasSite ? 'bg-green' : 'bg-orange'}`}
              aria-hidden
            />
            {t(hasSite ? 'key.site' : 'key.noSite')}
          </p>
          {hasSite && (
            <p className="-mt-2 mb-3 font-mono text-[12px] text-ink-2" data-testid="key-site-fingerprint">
              {t('key.fingerprint', { fp: keyFingerprint(siteKey()) })}
              {!looksLikeGoogleKey(siteKey()) && (
                <span className="block font-sans text-orange-ink">{t('key.badShape')}</span>
              )}
            </p>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
              {t('key.own')}
            </span>
            <input
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza…"
              className="w-full rounded-sm border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
              data-testid="key-input"
            />
          </label>
          {hasOwn && (
            <p className="mt-1 text-[12px] text-ink-2">
              {t('key.ownSet')} <span className="font-mono text-ink-2">{keyFingerprint(ownKey())}</span>
            </p>
          )}
          <p className="mt-2 text-[11px] leading-snug text-ink-3">{t('key.note')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-accent hover:underline"
            >
              {t('key.get')}
            </a>
            <div className="ml-auto flex gap-2">
              {hasOwn && (
                <button
                  onClick={() => {
                    setOwnKey('');
                    onClose();
                  }}
                  className="inline-flex h-8 items-center rounded-sm border border-line bg-raised px-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-fill-strong"
                >
                  {t('key.remove')}
                </button>
              )}
              <button
                onClick={() => {
                  setOwnKey(draft);
                  onClose();
                }}
                disabled={!draft.trim()}
                className="inline-flex h-8 items-center rounded-sm border border-accent-hover bg-accent px-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-40"
                data-testid="key-save"
              >
                {t('key.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
