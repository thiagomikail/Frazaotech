import { FileDown, FilePlus2, FolderOpen, Image, KeyRound, Menu, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { t } from '../strings';
import { netBounds } from './geometry';
import { normalizeNet, toIdent } from '../model/net';
import { emptyNet } from '../model/types';
import { ensureLayout, useStore, useToast } from '../state/store';
import { downloadText, pickTextFile } from '../util/files';
import { currentPalette } from './palette';

/** The diagram as a standalone SVG: world coordinates, the current appearance's colors, no UI overlays. */
function exportSvg(): string | null {
  const svg = document.querySelector<SVGSVGElement>('[data-testid="net-canvas"]');
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.petri-flash, animateMotion, animate').forEach((el) => el.remove());
  clone.querySelector('rect[fill="url(#petri-grid)"]')?.remove();
  const world = clone.querySelector(':scope > g');
  world?.setAttribute('transform', '');
  return clone.outerHTML;
}

export default function Header({ onOpenKey }: { onOpenKey: () => void }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  const baseName = toIdent(state.net.name || 'petri_net', 'net');

  const items = [
    {
      icon: FilePlus2,
      label: t('file.new'),
      run: () => {
        dispatch({ type: 'net/replace', net: emptyNet(), fit: true });
        dispatch({ type: 'ui/select', selection: null });
      },
    },
    {
      icon: FolderOpen,
      label: t('file.open'),
      run: async () => {
        const text = await pickTextFile('.json,application/json');
        if (!text) return;
        try {
          const { net } = normalizeNet(JSON.parse(text));
          if (net.places.length + net.transitions.length === 0) throw new Error('empty');
          dispatch({ type: 'net/replace', net: ensureLayout(net), fit: true });
        } catch {
          toast(t('file.badFile'), 'warn');
        }
      },
    },
    {
      icon: FileDown,
      label: t('file.save'),
      run: () => downloadText(`${baseName}.petri.json`, JSON.stringify(state.net, null, 2), 'application/json'),
    },
    {
      icon: Image,
      label: t('file.svg'),
      run: () => {
        const markup = exportSvg();
        if (!markup) return;
        const dir = state.net.layout?.direction ?? 'TB';
        const b = netBounds(state.net, dir);
        const w = Math.ceil(b.maxX - b.minX + 60);
        const h = Math.ceil(b.maxY - b.minY + 40);
        const body = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
        const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX - 20} ${b.minY - 20} ${w} ${h}" width="${w}" height="${h}" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"><rect x="${b.minX - 20}" y="${b.minY - 20}" width="${w}" height="${h}" fill="${currentPalette().bg}"/>${body}</svg>`;
        downloadText(`${baseName}.svg`, doc, 'image/svg+xml');
      },
    },
  ];

  return (
    <header className="relative z-20 flex h-11 shrink-0 items-center gap-2.5 border-b border-black/40 bg-bar px-3 text-on-bar">
      <a
        href="/"
        title="OT Workbench home"
        className="hidden items-center gap-2 text-on-bar-2 transition-colors hover:text-on-bar lg:flex"
      >
        <img src="/workbench-icon.svg" alt="" className="h-6 w-6" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">OT Workbench</span>
      </a>
      <div className="hidden h-5 w-px shrink-0 bg-bar-line lg:block" />
      <a href="/petri/" className="flex shrink-0 items-center gap-2">
        <img src="/petri-icon.svg" alt="" className="h-6 w-6" />
        <span className="text-[14px] font-bold uppercase tracking-[0.08em] text-on-bar">PetriPLC</span>
      </a>
      <span className="hidden text-[12px] font-medium uppercase tracking-[0.06em] text-on-bar-2 xl:inline">
        {t('app.tagline')}
      </span>
      {state.net.name && (
        <span
          className="ml-1 hidden max-w-[16rem] truncate rounded-sm border border-bar-line bg-bar-raised px-2 py-0.5 text-[12px] font-medium text-on-bar sm:inline"
          data-testid="net-title"
        >
          {state.net.name}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => dispatch({ type: 'net/undo' })}
          disabled={state.past.length === 0}
          title={t('header.undo')}
          aria-label={t('header.undo')}
          className="flex h-8 items-center justify-center gap-1.5 rounded-sm border border-bar-line bg-bar-raised text-[12px] font-semibold uppercase tracking-[0.04em] text-on-bar transition-colors hover:bg-bar-line disabled:opacity-40 w-8"
          data-testid="undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'net/redo' })}
          disabled={state.future.length === 0}
          title={t('header.redo')}
          aria-label={t('header.redo')}
          className="flex h-8 items-center justify-center gap-1.5 rounded-sm border border-bar-line bg-bar-raised text-[12px] font-semibold uppercase tracking-[0.04em] text-on-bar transition-colors hover:bg-bar-line disabled:opacity-40 w-8"
        >
          <Redo2 size={16} />
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            title={t('header.file')}
            aria-label={t('header.file')}
            aria-expanded={menu}
            className="flex h-8 items-center justify-center gap-1.5 rounded-sm border border-bar-line bg-bar-raised text-[12px] font-semibold uppercase tracking-[0.04em] text-on-bar transition-colors hover:bg-bar-line disabled:opacity-40 px-2.5"
          >
            <Menu size={16} />
            <span className="hidden sm:inline">{t('header.file')}</span>
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-30 w-60 overflow-hidden rounded-sm border border-line bg-raised py-1 shadow-pop">
              {items.map(({ icon: Icon, label, run }) => (
                <button
                  key={label}
                  onClick={() => {
                    setMenu(false);
                    void run();
                  }}
                  className="group flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-ink hover:bg-accent hover:text-on-accent"
                >
                  <Icon size={15} className="text-ink-2 group-hover:text-on-accent" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onOpenKey}
          title={t('header.key')}
          aria-label={t('header.key')}
          className="flex h-8 items-center justify-center gap-1.5 rounded-sm border border-bar-line bg-bar-raised text-[12px] font-semibold uppercase tracking-[0.04em] text-on-bar transition-colors hover:bg-bar-line disabled:opacity-40 w-8"
        >
          <KeyRound size={16} />
        </button>
      </div>
    </header>
  );
}
