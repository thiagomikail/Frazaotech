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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-title"
        className="w-full max-w-md rounded-2xl bg-raised p-5 shadow-pop"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/12 text-accent">
            <KeyRound size={16} />
          </span>
          <h2 id="key-title" className="text-[17px] font-semibold text-ink">
            {t('key.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('key.close')}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-fill text-ink-2 hover:bg-fill-strong"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <p className={`mb-3 text-[13px] leading-snug ${hasSite ? 'text-green-ink' : 'text-orange-ink'}`}>
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
          <span className="mb-1 block text-[12px] font-medium text-ink-2">{t('key.own')}</span>
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza…"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-3 transition-shadow focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none"
            data-testid="key-input"
          />
        </label>
        {hasOwn && (
          <p className="mt-1 text-[12px] text-accent">
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
                className="h-8 rounded-full bg-fill px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-fill-strong"
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
              className="h-8 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-40"
              data-testid="key-save"
            >
              {t('key.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
