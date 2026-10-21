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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onPointerDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-title"
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <KeyRound size={16} className="text-sky-400" />
          <h2 id="key-title" className="text-sm font-semibold text-slate-100">
            {t('key.title')}
          </h2>
          <button onClick={onClose} aria-label={t('key.close')} className="ml-auto text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <p className={`mb-3 text-sm ${hasSite ? 'text-emerald-300' : 'text-amber-300'}`}>
          {t(hasSite ? 'key.site' : 'key.noSite')}
        </p>
        {hasSite && (
          <p className="-mt-2 mb-3 font-mono text-xs text-slate-400" data-testid="key-site-fingerprint">
            {t('key.fingerprint', { fp: keyFingerprint(siteKey()) })}
            {!looksLikeGoogleKey(siteKey()) && (
              <span className="block font-sans text-amber-300">{t('key.badShape')}</span>
            )}
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">{t('key.own')}</span>
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza…"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            data-testid="key-input"
          />
        </label>
        {hasOwn && (
          <p className="mt-1 text-xs text-sky-300">
            {t('key.ownSet')} <span className="font-mono text-slate-400">{keyFingerprint(ownKey())}</span>
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-500">{t('key.note')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-sky-300 underline underline-offset-2 hover:text-sky-200"
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
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
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
              className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-40"
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
