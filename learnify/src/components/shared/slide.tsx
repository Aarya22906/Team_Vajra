import * as React from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import type { Slide } from '@/lib/mock-data';
import { diagrams } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export interface Brand { primary: string; secondary: string; accent: string; heading?: string; body?: string; logoText?: string; logoUrl?: string; footer?: string; showNumbers?: boolean }
export const defaultBrand: Brand = { primary: '#4F46E5', secondary: '#7C3AED', accent: '#10B981', logoText: 'TechSummit', footer: 'TechSummit Institute · Java Backend Track', showNumbers: true };

/** Diagram renderer shared by slides and the diagram gallery (coordinates are percentages). */
type DiagramData = { nodes: { id: string; label: string; x: number; y: number }[]; edges: [string, string][] | string[][] };
export function DiagramView({ id, data, brand = defaultBrand, className }: { id?: string; data?: DiagramData; brand?: Brand; className?: string }) {
  const d = data ?? diagrams.find(x => x.id === id) ?? diagrams[0];
  id = id ?? 'live';
  const byId = Object.fromEntries(d.nodes.map(n => [n.id, n]));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn('h-full w-full overflow-visible', className)}>
      <defs><marker id={`ah-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#64748B" /></marker></defs>
      {(d.edges as string[][]).map(([a, b], i) => {
        const p = byId[a], q = byId[b];
        const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
        const pad = 9;
        return <line key={i} x1={p.x + (dx / len) * pad} y1={p.y + (dy / len) * pad * 0.9} x2={q.x - (dx / len) * pad} y2={q.y - (dy / len) * pad * 0.9} stroke="#64748B" strokeWidth={0.6} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.6 }} markerEnd={`url(#ah-${id})`} />;
      })}
      {d.nodes.map((n, i) => (
        <foreignObject key={n.id} x={n.x - 13} y={n.y - 8} width={26} height={16} style={{ overflow: 'visible' }}>
          <div className="flex h-full w-full items-center justify-center rounded-[0.6em] border text-center font-semibold leading-tight shadow-sm"
            style={{ fontSize: 'max(9px, 1.1cqw)', borderColor: brand.primary, background: i === 0 ? brand.primary : `${brand.primary}12`, color: i === 0 ? '#fff' : 'inherit', padding: '0 4%' }}>
            {n.label}
          </div>
        </foreignObject>
      ))}
    </svg>
  );
}

function MiniCode({ code, lang = 'java' }: { code: string; lang?: string }) {
  return (
    <Highlight code={code} language={lang === 'java' ? 'tsx' : lang} theme={themes.nightOwl}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="m-0 overflow-hidden whitespace-pre font-mono" style={{ fontSize: '1.55cqw', lineHeight: 1.5 }}>
          {tokens.map((line, i) => <div key={i} {...getLineProps({ line })}>{line.map((t, k) => <span key={k} {...getTokenProps({ token: t })} />)}</div>)}
        </pre>
      )}
    </Highlight>
  );
}

/**
 * 16:9 slide in the brand template. Sizes use container query units so the same slide renders
 * identically as a thumbnail, in the editor and fullscreen.
 */
export function SlideCanvas({ slide, index, total, brand = defaultBrand, editable, onChange, className }: {
  slide: Slide; index: number; total: number; brand?: Brand; editable?: boolean;
  onChange?: (patch: Partial<Slide>) => void; className?: string;
}) {
  const edit = (field: 'title') => editable ? { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e: React.FocusEvent<HTMLElement>) => onChange?.({ [field]: e.currentTarget.textContent ?? '' }), className: 'outline-none rounded focus:ring-2 focus:ring-indigo-300/70 hover:bg-indigo-500/5' } : {};
  const editBullet = (i: number) => editable ? { contentEditable: true, suppressContentEditableWarning: true, onBlur: (e: React.FocusEvent<HTMLElement>) => { const b = [...slide.bullets]; b[i] = e.currentTarget.textContent ?? ''; onChange?.({ bullets: b }); }, className: 'outline-none rounded focus:ring-2 focus:ring-indigo-300/70 hover:bg-indigo-500/5' } : {};
  const footer = (dark?: boolean) => (
    <div className="absolute inset-x-[5%] bottom-[4%] flex items-center justify-between" style={{ fontSize: '1.05cqw', color: dark ? '#CBD5E1' : '#64748B' }}>
      <span className="flex items-center gap-[0.6cqw] font-semibold" style={{ color: dark ? '#fff' : '#0F172A' }}>{brand.logoUrl ? <img src={brand.logoUrl} alt="" className="object-contain" style={{ height: '2cqw', maxWidth: '6cqw' }} /> : <i className="inline-block rounded-[0.3cqw]" style={{ width: '1.6cqw', height: '1.6cqw', background: dark ? '#fff' : brand.primary }} />}{brand.logoText}</span>
      <span className="hidden sm:inline">{brand.footer}</span>
      {brand.showNumbers !== false && <span>{index + 1} / {total}</span>}
    </div>
  );

  let body: React.ReactNode;
  if (slide.layout === 'title') {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg text-white [container-type:inline-size]', className)} style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})` }}>
        <div className="absolute -right-[12%] -top-[30%] aspect-square w-[55%] rounded-full bg-white/10" />
        <div className="absolute -bottom-[35%] left-[30%] aspect-square w-[40%] rounded-full bg-white/5" />
        <div className="absolute left-[7%] top-[12%] flex items-center gap-[1cqw] font-semibold uppercase tracking-[0.25em]" style={{ fontSize: '1.2cqw' }}>{brand.logoUrl && <img src={brand.logoUrl} alt="" className="rounded bg-white/90 object-contain p-[0.3cqw]" style={{ height: '3cqw', maxWidth: '9cqw' }} />}{brand.logoText}</div>
        <div className="absolute left-[7%] right-[20%] top-[34%]">
          <h2 {...edit('title')} style={{ fontSize: '5.2cqw', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em' }}>{slide.title}</h2>
          <p className="mt-[2cqw] text-white/80" style={{ fontSize: '2cqw' }}>{slide.bullets[0]}</p>
        </div>
        <div className="absolute bottom-[9%] left-[7%] flex items-center gap-[1cqw] rounded-full bg-white/15 px-[1.4cqw] py-[0.5cqw] font-medium" style={{ fontSize: '1.2cqw' }}><span className="rounded-full" style={{ width: '0.9cqw', height: '0.9cqw', background: brand.accent }} />Code verified in an isolated sandbox</div>
      </div>
    );
  }
  const bulletList = (items: string[], size = '2.1cqw', offset = 0) => (
    <ul className="space-y-[1.3cqw]" style={{ fontSize: size }}>
      {items.map((b, i) => (
        <li key={i} className="flex gap-[1.2cqw] leading-snug"><span className="mt-[0.75cqw] shrink-0 rounded-[0.2cqw]" style={{ width: '0.8cqw', height: '0.8cqw', background: brand.primary }} /><span {...editBullet(i + offset)}>{b}</span></li>
      ))}
    </ul>
  );
  if (slide.layout === 'code') {
    body = (
      <div className="grid h-full grid-cols-[34%_1fr] gap-[2.5cqw]">
        {bulletList(slide.bullets, '1.75cqw')}
        <div className="self-start overflow-hidden rounded-[1.2cqw] bg-[#0B1120] p-[2cqw] pt-[3.2cqw] relative">
          <span className="absolute left-[1.6cqw] top-[1.2cqw] flex gap-[0.6cqw]">{['#F87171', '#FBBF24', '#34D399'].map(c => <i key={c} className="rounded-full" style={{ width: '0.9cqw', height: '0.9cqw', background: c }} />)}</span>
          <MiniCode code={slide.code ?? ''} lang={slide.lang} />
        </div>
      </div>
    );
  } else if (slide.layout === 'diagram') {
    body = <div className="grid h-full grid-cols-[30%_1fr] gap-[3cqw]">{bulletList(slide.bullets, '1.75cqw')}<div className="relative h-[85%]"><DiagramView id={slide.diagramId ?? 'd1'} data={slide.diagram} brand={brand} /></div></div>;
  } else if (slide.layout === 'two-col') {
    const mid = Math.ceil(slide.bullets.length / 2);
    body = (
      <div className="grid h-[85%] grid-cols-2 gap-[2cqw]">
        {[slide.bullets.slice(0, mid), slide.bullets.slice(mid)].map((col, k) => (
          <div key={k} className="rounded-[1.4cqw] p-[2.6cqw]" style={{ background: k ? `${brand.primary}12` : '#F1F5F9' }}>
            <h4 className="mb-[1.6cqw] font-mono font-semibold" style={{ fontSize: '2cqw', color: k ? brand.primary : '#0F172A' }}>{col[0]}</h4>
            {bulletList(col.slice(1), '1.75cqw', k ? mid + 1 : 1)}
          </div>
        ))}
      </div>
    );
  } else if (slide.layout === 'summary') {
    body = (
      <ul className="space-y-[1.8cqw]" style={{ fontSize: '2.15cqw' }}>
        {slide.bullets.map((b, i) => <li key={i} className="flex items-center gap-[1.6cqw]"><span className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ width: '3.2cqw', height: '3.2cqw', background: brand.primary, fontSize: '1.5cqw' }}>✓</span><span {...editBullet(i)}>{b}</span></li>)}
      </ul>
    );
  } else {
    body = bulletList(slide.bullets, '2.3cqw');
  }
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg bg-white text-slate-900 [container-type:inline-size]', className)}>
      <div className="absolute inset-y-0 left-0" style={{ width: '1.1cqw', background: `linear-gradient(${brand.primary}, ${brand.secondary})` }} />
      <div className="absolute inset-x-[5%] top-[7%] bottom-[12%] flex flex-col">
        <div className="mb-[1.4cqw] rounded-full" style={{ width: '4cqw', height: '0.55cqw', background: brand.primary }} />
        <h3 {...edit('title')} style={{ fontSize: '3.5cqw', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{slide.title}</h3>
        <div className="mt-[3cqw] min-h-0 flex-1">{body}</div>
      </div>
      {footer()}
    </div>
  );
}
