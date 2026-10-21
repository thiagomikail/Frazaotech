import { FileDown, FilePlus2, FolderOpen, Image, KeyRound, Menu, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { t } from '../strings';
import { netBounds, C } from './geometry';
import { normalizeNet, toIdent } from '../model/net';
import { emptyNet } from '../model/types';
import { ensureLayout, useStore, useToast } from '../state/store';
import { downloadText, pickTextFile } from '../util/files';
import { PetriMark } from './NetCanvas';

/** The diagram as a standalone SVG: world coordinates, dark background, no UI overlays. */
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
        const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX - 20} ${b.minY - 20} ${w} ${h}" width="${w}" height="${h}" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"><rect x="${b.minX - 20}" y="${b.minY - 20}" width="${w}" height="${h}" fill="${C.bg}"/>${body}</svg>`;
        downloadText(`${baseName}.svg`, doc, 'image/svg+xml');
      },
    },
  ];

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950 px-3">
      <a href="/petri/" className="flex items-center gap-2">
        <PetriMark className="h-7 w-7" />
        <span className="text-sm font-semibold tracking-tight text-slate-100">PetriPLC</span>
      </a>
      <span className="hidden text-xs text-slate-500 md:inline">{t('app.tagline')}</span>
      <a href="/" className="hidden text-xs text-slate-500 hover:text-slate-300 lg:inline">
        · OT Workbench
      </a>
      {state.net.name && (
        <span
          className="ml-2 hidden max-w-[16rem] truncate rounded bg-slate-900 px-2 py-0.5 text-xs text-slate-300 sm:inline"
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
          className="flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          data-testid="undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'net/redo' })}
          disabled={state.future.length === 0}
          title={t('header.redo')}
          aria-label={t('header.redo')}
          className="flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30"
        >
          <Redo2 size={16} />
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            title={t('header.file')}
            aria-label={t('header.file')}
            aria-expanded={menu}
            className="flex h-8 items-center gap-1 rounded px-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <Menu size={16} />
            <span className="hidden sm:inline">{t('header.file')}</span>
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-md border border-slate-700 bg-slate-900 py-1 shadow-xl">
              {items.map(({ icon: Icon, label, run }) => (
                <button
                  key={label}
                  onClick={() => {
                    setMenu(false);
                    void run();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  <Icon size={15} className="text-slate-400" />
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
          className="flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800"
        >
          <KeyRound size={16} />
        </button>
      </div>
    </header>
  );
}
