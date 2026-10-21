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
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface/80 px-3 backdrop-blur-xl backdrop-saturate-150">
      <a href="/petri/" className="flex items-center gap-2">
        <img src="/petri-icon.svg" alt="" className="h-7 w-7" />
        <span className="text-[15px] font-semibold tracking-tight text-ink">PetriPLC</span>
      </a>
      <span className="hidden text-[13px] text-ink-2 md:inline">{t('app.tagline')}</span>
      <a href="/" className="hidden items-center gap-1.5 text-[13px] text-ink-3 hover:text-accent lg:flex">
        <span aria-hidden="true">·</span>
        <img src="/workbench-icon.svg" alt="" className="h-4 w-4" />
        OT Workbench
      </a>
      {state.net.name && (
        <span
          className="ml-2 hidden max-w-[16rem] truncate rounded-full bg-fill px-2.5 py-0.5 text-[12px] font-medium text-ink-2 sm:inline"
          data-testid="net-title"
        >
          {state.net.name}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => dispatch({ type: 'net/undo' })}
          disabled={state.past.length === 0}
          title={t('header.undo')}
          aria-label={t('header.undo')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-accent transition-colors hover:bg-fill disabled:text-ink-3 disabled:opacity-50"
          data-testid="undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'net/redo' })}
          disabled={state.future.length === 0}
          title={t('header.redo')}
          aria-label={t('header.redo')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-accent transition-colors hover:bg-fill disabled:text-ink-3 disabled:opacity-50"
        >
          <Redo2 size={16} />
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            title={t('header.file')}
            aria-label={t('header.file')}
            aria-expanded={menu}
            className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-accent transition-colors hover:bg-fill"
          >
            <Menu size={16} />
            <span className="hidden sm:inline">{t('header.file')}</span>
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-30 w-60 overflow-hidden rounded-xl border border-line bg-raised/95 p-1 shadow-pop backdrop-blur-xl">
              {items.map(({ icon: Icon, label, run }) => (
                <button
                  key={label}
                  onClick={() => {
                    setMenu(false);
                    void run();
                  }}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-accent hover:text-on-accent"
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
          className="flex h-8 w-8 items-center justify-center rounded-full text-accent transition-colors hover:bg-fill"
        >
          <KeyRound size={16} />
        </button>
      </div>
    </header>
  );
}
