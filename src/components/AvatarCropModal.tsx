import { useCallback, useEffect, useRef, useState, type PointerEvent, type SyntheticEvent } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/** Matches mugshot frame (w-36 h-44 / 9:11). */
export const AVATAR_ASPECT = 9 / 11;
const OUTPUT_H = 528;
const OUTPUT_W = Math.round(OUTPUT_H * AVATAR_ASPECT);

interface AvatarCropModalProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

export function AvatarCropModal({ open, file, onClose, onConfirm }: AvatarCropModalProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !open) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  const frameSize = useCallback(() => {
    const el = frameRef.current;
    if (!el) return { fw: 216, fh: 264 };
    return { fw: el.clientWidth, fh: el.clientHeight };
  }, []);

  function clampOffset(z: number, ox: number, oy: number, nw: number, nh: number) {
    const { fw, fh } = frameSize();
    const dw = nw * z;
    const dh = nh * z;
    if (dw <= fw && dh <= fh) {
      return { x: (fw - dw) / 2, y: (fh - dh) / 2 };
    }
    if (dw <= fw) {
      return { x: (fw - dw) / 2, y: Math.min(0, Math.max(fh - dh, oy)) };
    }
    if (dh <= fh) {
      return { x: Math.min(0, Math.max(fw - dw, ox)), y: (fh - dh) / 2 };
    }
    return {
      x: Math.min(0, Math.max(fw - dw, ox)),
      y: Math.min(0, Math.max(fh - dh, oy)),
    };
  }

  function applyFit(mode: 'cover' | 'contain', nw = natural.w, nh = natural.h) {
    if (!nw || !nh) return;
    const { fw, fh } = frameSize();
    const cover = Math.max(fw / nw, fh / nh);
    const contain = Math.min(fw / nw, fh / nh);
    const z = mode === 'cover' ? cover : contain;
    const minZ = cover * 0.85;
    setMinZoom(minZ);
    setZoom(z);
    setOffset(clampOffset(z, 0, 0, nw, nh));
  }

  function onImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNatural({ w: nw, h: nh });
    requestAnimationFrame(() => applyFit('cover', nw, nh));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(
      clampOffset(zoom, dragStart.current.ox + dx, dragStart.current.oy + dy, natural.w, natural.h)
    );
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onZoomChange(next: number) {
    const { fw, fh } = frameSize();
    const cx = fw / 2;
    const cy = fh / 2;
    const imgX = (cx - offset.x) / zoom;
    const imgY = (cy - offset.y) / zoom;
    const ox = cx - imgX * next;
    const oy = cy - imgY * next;
    setZoom(next);
    setOffset(clampOffset(next, ox, oy, natural.w, natural.h));
  }

  async function handleConfirm() {
    if (!src || !natural.w) return;
    setSaving(true);
    try {
      const img = await loadImage(src);
      const { fw, fh } = frameSize();
      const scale = OUTPUT_W / fw;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_W;
      canvas.height = OUTPUT_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      ctx.fillStyle = '#181818';
      ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);
      ctx.drawImage(
        img,
        offset.x * scale,
        offset.y * scale,
        natural.w * zoom * scale,
        natural.h * zoom * scale
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Could not export image'))),
          'image/jpeg',
          0.92
        );
      });
      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open && !!file} onClose={onClose} title="Fit photo" className="max-w-md">
      <div className="space-y-5">
        <p className="text-sm text-proddaily-text-2">
          Drag to reposition. Zoom and fit so the photo fills your mugshot frame.
        </p>

        <div className="flex justify-center">
          <div
            ref={frameRef}
            className="relative w-[216px] h-[264px] overflow-hidden border-2 pd-accent-border bg-proddaily-bg-2 shadow-[6px_6px_0_rgba(0,0,0,0.4)] touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <div className="absolute inset-x-0 top-0 h-1 pd-accent-bg z-10 pointer-events-none" />
            {src && (
              <img
                src={src}
                alt=""
                draggable={false}
                onLoad={onImageLoad}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: natural.w ? natural.w * zoom : undefined,
                  height: natural.h ? natural.h * zoom : undefined,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            )}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-proddaily-text-2 font-serif tracking-widest uppercase">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={minZoom}
            max={Math.max(minZoom * 3, minZoom + 0.5)}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full accent-[var(--pd-accent)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => applyFit('cover')}>
            <Maximize2 size={14} /> Fill frame
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => applyFit('contain')}>
            <Minimize2 size={14} /> Fit inside
          </Button>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" className="flex-1" disabled={saving || !natural.w} onClick={() => void handleConfirm()}>
            {saving ? 'Saving…' : 'Use photo'}
          </Button>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
