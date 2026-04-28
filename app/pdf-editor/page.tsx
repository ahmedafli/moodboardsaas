"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

type PremiumPdfExportPayload = {
  version: 1;
  createdAt: number;
  moodboardName: string | null;
  moodboardImg: string; // data URL
  tableRows?: Array<{
    ref: string;
    item: string;
    price: string;
    qty: number;
    image?: string;
  }>;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

type Rect = { x: number; y: number; w: number; h: number };
type DragHandle = "move" | "tl" | "tr" | "bl" | "br";

async function trimWhiteMargins(dataUrl: string, opts?: { padding?: number }) {
  const padding = opts?.padding ?? 18;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to decode image for trim"));
    i.src = dataUrl;
  });

  const MAX_SCAN = 900; // speed guard
  const scale = Math.min(1, MAX_SCAN / Math.max(img.width, img.height));
  const scanW = Math.max(1, Math.round(img.width * scale));
  const scanH = Math.max(1, Math.round(img.height * scale));

  const scan = document.createElement("canvas");
  scan.width = scanW;
  scan.height = scanH;
  const sctx = scan.getContext("2d", { willReadFrequently: true });
  if (!sctx) return dataUrl;
  sctx.drawImage(img, 0, 0, scanW, scanH);

  const { data } = sctx.getImageData(0, 0, scanW, scanH);
  const isContent = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 10) return false;
    // treat near-white as background
    return !(r > 245 && g > 245 && b > 245);
  };

  let minX = scanW, minY = scanH, maxX = -1, maxY = -1;
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = (y * scanW + x) * 4;
      if (!isContent(idx)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  // If no content found, keep original.
  if (maxX < 0 || maxY < 0) return dataUrl;

  // expand bounds with padding (in original pixels)
  const inv = 1 / scale;
  const padPx = Math.round(padding * inv);
  const cropX = clamp(Math.round(minX * inv) - padPx, 0, img.width - 1);
  const cropY = clamp(Math.round(minY * inv) - padPx, 0, img.height - 1);
  const cropW = clamp(Math.round((maxX - minX + 1) * inv) + padPx * 2, 1, img.width - cropX);
  const cropH = clamp(Math.round((maxY - minY + 1) * inv) + padPx * 2, 1, img.height - cropY);

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const octx = out.getContext("2d");
  if (!octx) return dataUrl;
  octx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL("image/png");
}

function clampRect(next: Rect, boundsW: number, boundsH: number, minW = 40, minH = 40): Rect {
  const w = clamp(next.w, minW, boundsW);
  const h = clamp(next.h, minH, boundsH);
  const x = clamp(next.x, 0, Math.max(0, boundsW - w));
  const y = clamp(next.y, 0, Math.max(0, boundsH - h));
  return { x, y, w, h };
}

function clampFreeRect(next: Rect, minW = 40, minH = 40, maxW = 100000, maxH = 100000): Rect {
  const w = clamp(next.w, minW, maxW);
  const h = clamp(next.h, minH, maxH);
  return { x: next.x, y: next.y, w, h };
}

function ResizableDraggable({
  id,
  selectedId,
  setSelectedId,
  mode,
  rect,
  onRectChange,
  boundsW,
  boundsH,
  minW = 60,
  minH = 60,
  freeTransform = false,
  handleColorClass,
  children,
}: {
  id: string;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  mode: "edit" | "preview";
  rect: Rect;
  onRectChange: (rect: Rect) => void;
  boundsW: number;
  boundsH: number;
  minW?: number;
  minH?: number;
  freeTransform?: boolean;
  handleColorClass: string;
  children: React.ReactNode;
}) {
  const isSelected = selectedId === id;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{
    active: boolean;
    handle: DragHandle;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRectRef = useRef<Rect | null>(null);

  const flushRect = () => {
    if (!pendingRectRef.current) return;
    onRectChange(pendingRectRef.current);
    pendingRectRef.current = null;
  };

  const scheduleRect = (next: Rect) => {
    pendingRectRef.current = next;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flushRect();
    });
  };

  const start = (e: React.PointerEvent, handle: DragHandle) => {
    if (mode !== "edit") return;
    e.stopPropagation();
    setSelectedId(id);

    // Capture pointer on the root element so pointermove keeps flowing even when starting on a handle.
    const root = rootRef.current;
    if (root) {
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    pointer.current = {
      active: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
    };

    // Prevent text selection / scroll during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = handle === "move" ? "grabbing" : "nwse-resize";
  };

  const move = (clientX: number, clientY: number) => {
    if (mode !== "edit") return;
    if (!pointer.current?.active) return;

    const dx = clientX - pointer.current.startX;
    const dy = clientY - pointer.current.startY;
    const r = pointer.current.startRect;
    const handle = pointer.current.handle;

    let next: Rect = r;

    if (handle === "move") {
      next = { ...r, x: r.x + dx, y: r.y + dy };
    } else if (handle === "tl") {
      next = { x: r.x + dx, y: r.y + dy, w: r.w - dx, h: r.h - dy };
    } else if (handle === "tr") {
      next = { x: r.x, y: r.y + dy, w: r.w + dx, h: r.h - dy };
    } else if (handle === "bl") {
      next = { x: r.x + dx, y: r.y, w: r.w - dx, h: r.h + dy };
    } else if (handle === "br") {
      next = { x: r.x, y: r.y, w: r.w + dx, h: r.h + dy };
    }

    scheduleRect(
      freeTransform
        ? clampFreeRect(next, minW, minH, boundsW * 10, boundsH * 10)
        : clampRect(next, boundsW, boundsH, minW, minH)
    );
  };

  const end = (pointerId?: number) => {
    if (!pointer.current?.active) return;
    const root = rootRef.current;
    if (root && typeof pointerId === "number") {
      try {
        root.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    pointer.current = null;
    flushRect();
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  return (
    <div
      ref={rootRef}
      className={`absolute ${mode === "edit" ? "cursor-move" : ""} ${
        isSelected && mode === "edit" ? "ring-2 ring-orange-400 ring-offset-2 ring-offset-white" : ""
      }`}
      onPointerDown={(e) => start(e, "move")}
      onPointerMove={(e) => {
        if (!pointer.current?.active) return;
        e.preventDefault();
        move(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onLostPointerCapture={() => end()}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        touchAction: "none",
      }}
      role="presentation"
    >
      {children}

      {mode === "edit" && isSelected && (
        <>
          <div
            className={`absolute -top-[6px] -left-[6px] w-3 h-3 ${handleColorClass} border-2 border-white rounded-[3px] z-30 shadow-sm cursor-nw-resize`}
            onPointerDown={(e) => start(e, "tl")}
            role="presentation"
          />
          <div
            className={`absolute -top-[6px] -right-[6px] w-3 h-3 ${handleColorClass} border-2 border-white rounded-[3px] z-30 shadow-sm cursor-ne-resize`}
            onPointerDown={(e) => start(e, "tr")}
            role="presentation"
          />
          <div
            className={`absolute -bottom-[6px] -left-[6px] w-3 h-3 ${handleColorClass} border-2 border-white rounded-[3px] z-30 shadow-sm cursor-sw-resize`}
            onPointerDown={(e) => start(e, "bl")}
            role="presentation"
          />
          <div
            className={`absolute -bottom-[6px] -right-[6px] w-3 h-3 ${handleColorClass} border-2 border-white rounded-[3px] z-30 shadow-sm cursor-se-resize`}
            onPointerDown={(e) => start(e, "br")}
            role="presentation"
          />
        </>
      )}
    </div>
  );
}

export default function PdfEditorPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<PremiumPdfExportPayload | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [zoom, setZoom] = useState(75);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("moodboard");

  const page1Ref = useRef<HTMLDivElement | null>(null);
  const page2Ref = useRef<HTMLDivElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [page1Bounds, setPage1Bounds] = useState({ w: 0, h: 0 });
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [moodboardSrc, setMoodboardSrc] = useState<string | null>(null);

  // Page 1 moodboard "auto crop" behavior:
  // we scale/drag the image INSIDE a fixed viewport (overflow hidden).
  const [mbScale, setMbScale] = useState(1.15);
  const [mbOffset, setMbOffset] = useState({ x: 0, y: 0 });
  const mbPointerRef = useRef<{
    active: boolean;
    handle: "move" | "scale";
    startX: number;
    startY: number;
    startScale: number;
    startOffset: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("premiumPdfExportPayload");
      if (!raw) return;
      const parsed = JSON.parse(raw) as PremiumPdfExportPayload;
      if (parsed?.version !== 1 || !parsed?.moodboardImg) return;
      setPayload(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!payload?.moodboardImg) return;
    let cancelled = false;
    (async () => {
      try {
        const trimmed = await trimWhiteMargins(payload.moodboardImg, { padding: 22 });
        if (!cancelled) setMoodboardSrc(trimmed);
      } catch {
        if (!cancelled) setMoodboardSrc(payload.moodboardImg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload?.moodboardImg]);

  const scale = useMemo(() => clamp(zoom, 25, 200) / 100, [zoom]);
  const tableRows = payload?.tableRows ?? [];
  const rowsPerPage = 8;
  const tablePages = useMemo(() => {
    if (tableRows.length === 0) return [[]] as typeof tableRows[];
    const pages: typeof tableRows[] = [];
    for (let i = 0; i < tableRows.length; i += rowsPerPage) {
      pages.push(tableRows.slice(i, i + rowsPerPage));
    }
    return pages;
  }, [tableRows]);

  const parsePrice = (price: string) => {
    const n = Number((price || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const grandTotal = useMemo(
    () => tableRows.reduce((sum, row) => sum + parsePrice(row.price) * row.qty, 0),
    [tableRows]
  );

  const exportPremiumPdf = async () => {
    if (!payload) return;

    try {
      setIsExporting(true);
      // Let the UI paint the exporting overlay before heavy work starts.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      // @ts-ignore
      const domtoimage = (await import("dom-to-image-more")).default;
      const jsPDF = (await import("jspdf")).default;

      const pdf = new jsPDF({
        orientation: "l",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const compressDataUrl = async (src: string, opts?: { maxW?: number; maxH?: number; quality?: number }) => {
        const maxW = opts?.maxW ?? 2200;
        const maxH = opts?.maxH ?? 1600;
        const quality = opts?.quality ?? 0.78;
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Failed to decode image"));
          el.src = src;
        });
        const ratio = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
        const w = Math.max(1, Math.round(img.naturalWidth * ratio));
        const h = Math.max(1, Math.round(img.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return src;
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/jpeg", quality);
      };

      // -------- Page 1: capture the actual frame (respects positioning) --------
      let firstPageImage: string;
      if (page1Ref.current) {
        // Render to canvas using current mbScale/mbOffset to guarantee WYSIWYG without DOM artifacts.
        const viewportW = page1Ref.current.offsetWidth;
        const viewportH = page1Ref.current.offsetHeight;
        const exportScale = 2.5;

        const src = moodboardSrc || payload.moodboardImg;
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Failed to decode moodboard image"));
          el.src = src;
        });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewportW * exportScale));
        canvas.height = Math.max(1, Math.round(viewportH * exportScale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to create export canvas");

        // White page background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Compute "contain" placement, then apply mbScale + mbOffset around center.
        const baseContain = Math.min(viewportW / img.naturalWidth, viewportH / img.naturalHeight);
        const finalScale = baseContain * mbScale;
        const drawW = img.naturalWidth * finalScale;
        const drawH = img.naturalHeight * finalScale;

        const cx = viewportW / 2 + mbOffset.x;
        const cy = viewportH / 2 + mbOffset.y;
        const dx = (cx - drawW / 2) * exportScale;
        const dy = (cy - drawH / 2) * exportScale;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, dx, dy, drawW * exportScale, drawH * exportScale);

        firstPageImage = canvas.toDataURL("image/jpeg", 0.88);
        firstPageImage = await compressDataUrl(firstPageImage, { maxW: 2600, maxH: 1800, quality: 0.82 });
      } else {
        const firstPageImageRaw = moodboardSrc || payload.moodboardImg;
        firstPageImage = await compressDataUrl(firstPageImageRaw, { maxW: 2600, maxH: 1800, quality: 0.82 });
      }
      const pageW1 = pdf.internal.pageSize.getWidth();
      const pageH1 = pdf.internal.pageSize.getHeight();
      const margin1 = 4;
      const maxW1 = pageW1 - margin1 * 2;
      const maxH1 = pageH1 - margin1 * 2;

      const props1 = pdf.getImageProperties(firstPageImage);
      const ratio1 = props1.width / props1.height;
      let drawW1 = maxW1;
      let drawH1 = drawW1 / ratio1;
      if (drawH1 > maxH1) {
        drawH1 = maxH1;
        drawW1 = drawH1 * ratio1;
      }
      const x1 = (pageW1 - drawW1) / 2;
      const y1 = (pageH1 - drawH1) / 2;
      pdf.addImage(firstPageImage, "JPEG", x1, y1, drawW1, drawH1, undefined, "FAST");

      // -------- Page 2+: render clean table directly in jsPDF (stable output) --------
      const imageCache = new Map<string, string | null>();
      const toDataUrl = async (src?: string) => {
        if (!src) return null;
        if (imageCache.has(src)) return imageCache.get(src) ?? null;
        if (src.startsWith("data:")) {
          try {
            const normalized = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.naturalWidth || img.width || 1;
                  canvas.height = img.naturalHeight || img.height || 1;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) throw new Error("canvas context failed");
                  ctx.drawImage(img, 0, 0);
                  resolve(canvas.toDataURL("image/png"));
                } catch (e) {
                  reject(e);
                }
              };
              img.onerror = () => reject(new Error("image decode failed"));
              img.src = src;
            });
            imageCache.set(src, normalized);
            return normalized;
          } catch {
            imageCache.set(src, src);
            return src;
          }
        }
        try {
          const proxiedSrc = src.startsWith("http")
            ? `https://wsrv.nl/?url=${encodeURIComponent(src)}`
            : src;
          const res = await fetch(proxiedSrc);
          if (!res.ok) throw new Error("image fetch failed");
          const blob = await res.blob();
          const rawDataUrl = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(new Error("file reader failed"));
            fr.readAsDataURL(blob);
          });
          const normalized = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width || 1;
                canvas.height = img.naturalHeight || img.height || 1;
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("canvas context failed");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              } catch (e) {
                reject(e);
              }
            };
            img.onerror = () => reject(new Error("image decode failed"));
            img.src = rawDataUrl;
          });
          imageCache.set(src, normalized);
          return normalized;
        } catch {
          imageCache.set(src, null);
          return null;
        }
      };

      const drawTablePage = async (
        rows: typeof tableRows,
        pageIndex: number,
        totalPages: number
      ) => {
        pdf.addPage("a4", "p");
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const startX = margin;
        let y = margin + 2;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text("INVENTORY", startX, y);
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Page ${pageIndex + 1}/${totalPages}`, pageW - margin, y, { align: "right" });
        pdf.setTextColor(0, 0, 0);
        y += 5;

        const tableW = pageW - margin * 2;
        const colW = {
          image: tableW * 0.14,
          item: tableW * 0.38,
          ref: tableW * 0.22,
          qty: tableW * 0.10,
          price: tableW * 0.16,
        };
        const cols = ["IMAGE", "ITEM", "REF", "QTY", "PRICE"] as const;
        const widths = [colW.image, colW.item, colW.ref, colW.qty, colW.price];

        const headerH = 9;
        let x = startX;
        // Header background: draw one strip to avoid fill artifacts.
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(startX, y, tableW, headerH, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        for (let i = 0; i < cols.length; i += 1) {
          // Cell borders only (background already painted)
          pdf.rect(x, y, widths[i], headerH);
          const align = i === 3 ? "center" : i === 4 ? "right" : "left";
          const tx = align === "left" ? x + 2 : align === "center" ? x + widths[i] / 2 : x + widths[i] - 2;
          pdf.text(cols[i], tx, y + 6, { align: align as "left" | "center" | "right" });
          x += widths[i];
        }
        y += headerH;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(40, 40, 40);
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
          const row = rows[rowIndex];
          const rowH = 20;
          x = startX;
          // Always paint a white row background first to avoid any PDF viewer/fill-state artifacts.
          pdf.setFillColor(255, 255, 255);
          pdf.rect(startX, y, tableW, rowH, "F");
          if (rowIndex % 2 === 1) {
            pdf.setFillColor(252, 252, 252);
            pdf.rect(startX, y, tableW, rowH, "F");
          }

          // IMAGE cell
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(x, y, colW.image, rowH);
          pdf.setFillColor(255, 255, 255);
          pdf.rect(x + 1, y + 1, colW.image - 2, rowH - 2, "F");
          const imgData = await toDataUrl(row.image);
          if (imgData) {
            try {
              pdf.addImage(imgData, "PNG", x + 2, y + 2, 14, 14);
            } catch {
              // ignore image decode errors
            }
          }
          x += colW.image;

          // ITEM
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(x, y, colW.item, rowH);
          const itemLines = pdf.splitTextToSize(row.item || "-", colW.item - 4).slice(0, 3);
          pdf.setTextColor(30, 30, 30);
          pdf.text(itemLines, x + 2, y + 5);
          x += colW.item;

          // REF
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(x, y, colW.ref, rowH);
          const refLines = pdf.splitTextToSize(row.ref || "-", colW.ref - 4).slice(0, 2);
          pdf.setTextColor(60, 60, 60);
          pdf.text(refLines, x + 2, y + 5);
          x += colW.ref;

          // QTY
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(x, y, colW.qty, rowH);
          pdf.setTextColor(30, 30, 30);
          pdf.text(String(row.qty), x + colW.qty / 2, y + 10, { align: "center" });
          x += colW.qty;

          // PRICE
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(x, y, colW.price, rowH);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(20, 20, 20);
          pdf.text(row.price || "-", x + colW.price - 2, y + 10, { align: "right" });
          pdf.setFont("helvetica", "normal");

          y += rowH;
        }

        if (pageIndex === totalPages - 1) {
          const totalH = 10;
          x = startX;
          pdf.setFillColor(248, 250, 252);
          pdf.rect(startX, y, tableW, totalH, "F");
          pdf.rect(startX, y, tableW, totalH);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.text("GRAND TOTAL", startX + colW.image + 2, y + 6.5);
          pdf.text(`AED ${grandTotal.toLocaleString()}`, startX + tableW - 2, y + 6.5, { align: "right" });
          pdf.setFont("helvetica", "normal");

          // Fixed logo on bottom-right of the last page.
          if (logoSrc) {
            const logoData = await toDataUrl(logoSrc);
            if (logoData) {
              const logoW = 36;
              const logoH = 18;
              const lx = pageW - margin - logoW;
              const ly = pageH - margin - logoH;
              // No border around the logo in export
              try {
                const lp = pdf.getImageProperties(logoData);
                const boxW = logoW - 2;
                const boxH = logoH - 2;
                const lr = lp.width / lp.height;
                let lw = boxW;
                let lh = lw / lr;
                if (lh > boxH) {
                  lh = boxH;
                  lw = lh * lr;
                }
                const cx = lx + 1 + (boxW - lw) / 2;
                const cy = ly + 1 + (boxH - lh) / 2;
                pdf.addImage(logoData, "PNG", cx, cy, lw, lh);
              } catch {
                // ignore logo decode errors
              }
            }
          }
        }
      };

      for (let i = 0; i < tablePages.length; i += 1) {
        await drawTablePage(tablePages[i], i, tablePages.length);
      }

      const fileName = payload.moodboardName
        ? `${payload.moodboardName}-export.pdf`
        : "moodboard-export.pdf";
      pdf.save(fileName);

    } catch (error) {
      console.error("Premium export failed:", error);
      alert(`Failed to export PDF. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const p1 = page1Ref.current;

    const measure = () => {
      if (p1) {
        const r = p1.getBoundingClientRect();
        setPage1Bounds({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    };

    // payload arrives after first mount; measure once refs exist
    const raf1 = requestAnimationFrame(measure);
    const raf2 = requestAnimationFrame(measure);

    window.addEventListener("resize", measure);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      if (p1) ro.observe(p1);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [payload]);

  useEffect(() => {
    // When a new moodboard loads, reset to a good "fill" default.
    if (!payload?.moodboardImg) return;
    setMbScale(1.15);
    setMbOffset({ x: 0, y: 0 });
  }, [payload?.moodboardImg]);

  const onPickLogo = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read logo file"));
      reader.readAsDataURL(file);
    });
    setLogoSrc(dataUrl);
    setSelectedId(null);
  };

  if (!payload) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg w-full shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Icon icon="lucide:file-text" className="text-white text-xl" />
            </div>
            <div className="font-bold text-slate-900">PDF ARCHITECT</div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            No export session found. Go back to your moodboard and click <b>Export PDF</b> again.
          </p>
          <button
            onClick={() => router.push("/moodboard")}
            className="mt-6 w-full bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99]"
          >
            Back to Moodboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <div data-pdf-root className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/95 border border-white/60 shadow-2xl rounded-3xl px-8 py-6 flex items-center gap-4">
            <Icon icon="lucide:loader-2" className="text-2xl animate-spin text-slate-700" />
            <div>
              <div className="font-extrabold text-slate-900">Exporting PDF…</div>
              <div className="text-xs text-slate-500 mt-0.5">Please wait a moment.</div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          @page { margin: 0; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          [data-pdf-root], [data-pdf-root] * { visibility: visible !important; }
          [data-pdf-root] {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }
          header { display: none !important; }
          main { padding: 0 !important; background: #fff !important; overflow: visible !important; }
          [data-print-pages] {
            transform: none !important;
            gap: 0 !important;
            padding: 0 !important;
          }
          [data-print-page] {
            margin: 0 auto !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }
          [data-print-page]:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Icon icon="lucide:file-text" className="text-white text-lg" />
          </div>
          <span className="text-slate-900 font-bold tracking-tight text-sm truncate">
            PDF ARCHITECT <span className="text-slate-400 font-normal ml-2">PRO EDITION</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMode("edit")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "edit"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              EDIT
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "preview"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              PREVIEW
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <button
              onClick={() => setZoom((z) => clamp(z - 10, 25, 200))}
              className="hover:text-slate-900 transition-colors"
              aria-label="Zoom out"
            >
              <Icon icon="lucide:minus" />
            </button>
            <span className="text-xs font-bold w-10 text-center text-slate-900">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => clamp(z + 10, 25, 200))}
              className="hover:text-slate-900 transition-colors"
              aria-label="Zoom in"
            >
              <Icon icon="lucide:plus" />
            </button>
          </div>

          <button
            onClick={exportPremiumPdf}
            disabled={isExporting}
            className="bg-slate-900 hover:bg-slate-800 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.99] flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Icon icon={isExporting ? "lucide:loader-2" : "lucide:download"} className={isExporting ? "animate-spin" : ""} />
            EXPORT PDF
          </button>
        </div>
      </header>

      <main
        className="flex-1 overflow-auto p-12 flex justify-center"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      >
        <div
          data-print-pages
          className="flex flex-col items-center gap-16 min-w-max pb-20"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
          onPointerDown={() => {
            if (mode === "edit") setSelectedId(null);
          }}
        >
          {/* Page 1: A4 Landscape Moodboard */}
          <div id="moodboard-page" data-print-page className="bg-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] relative flex-shrink-0 border border-slate-200 p-8 w-[842px] h-[595px]">
            <div ref={page1Ref} className="relative w-full h-full">
              <div
                id="moodboard-frame"
                className={`w-full h-full rounded-2xl overflow-hidden border-2 transition-all bg-white relative ${
                  mode === "edit" && selectedId === "moodboard" ? "border-orange-500" : "border-slate-100"
                }`}
                onPointerDown={(e) => {
                  if (mode !== "edit") return;
                  e.stopPropagation();
                  setSelectedId("moodboard");
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  mbPointerRef.current = {
                    active: true,
                    handle: "move",
                    startX: e.clientX,
                    startY: e.clientY,
                    startScale: mbScale,
                    startOffset: mbOffset,
                  };
                  document.body.style.userSelect = "none";
                  document.body.style.cursor = "grabbing";
                }}
                onPointerMove={(e) => {
                  if (mode !== "edit") return;
                  if (!mbPointerRef.current?.active) return;
                  e.preventDefault();
                  const dx = e.clientX - mbPointerRef.current.startX;
                  const dy = e.clientY - mbPointerRef.current.startY;

                  if (mbPointerRef.current.handle === "move") {
                    setMbOffset({
                      x: mbPointerRef.current.startOffset.x + dx,
                      y: mbPointerRef.current.startOffset.y + dy,
                    });
                  } else {
                    const next = clamp(mbPointerRef.current.startScale + dx / 250, 0.2, 12);
                    setMbScale(next);
                  }
                }}
                onPointerUp={(e) => {
                  mbPointerRef.current = null;
                  document.body.style.userSelect = "";
                  document.body.style.cursor = "";
                  try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                onPointerCancel={() => {
                  mbPointerRef.current = null;
                  document.body.style.userSelect = "";
                  document.body.style.cursor = "";
                }}
                style={{ touchAction: "none" }}
                role="presentation"
              >
                <img
                  src={moodboardSrc || payload.moodboardImg}
                  alt="Moodboard"
                  draggable={false}
                  className="absolute left-1/2 top-1/2 select-none"
                  style={{
                    transform: `translate(calc(-50% + ${mbOffset.x}px), calc(-50% + ${mbOffset.y}px)) scale(${mbScale})`,
                    transformOrigin: "center",
                    willChange: "transform",
                    maxWidth: "none",
                    maxHeight: "none",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />

                {mode === "edit" && selectedId === "moodboard" && (
                  <>
                    {/* Corner handles = scale image (not resize frame) */}
                    <div
                      className="absolute -top-[6px] -left-[6px] w-3 h-3 bg-amber-500 border-2 border-white rounded-[3px] z-30 shadow-sm cursor-nw-resize"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture(e.pointerId);
                        mbPointerRef.current = {
                          active: true,
                          handle: "scale",
                          startX: e.clientX,
                          startY: e.clientY,
                          startScale: mbScale,
                          startOffset: mbOffset,
                        };
                        document.body.style.userSelect = "none";
                        document.body.style.cursor = "nwse-resize";
                      }}
                      role="presentation"
                    />
                    <div
                      className="absolute -top-[6px] -right-[6px] w-3 h-3 bg-amber-500 border-2 border-white rounded-[3px] z-30 shadow-sm cursor-ne-resize"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture(e.pointerId);
                        mbPointerRef.current = {
                          active: true,
                          handle: "scale",
                          startX: e.clientX,
                          startY: e.clientY,
                          startScale: mbScale,
                          startOffset: mbOffset,
                        };
                        document.body.style.userSelect = "none";
                        document.body.style.cursor = "nesw-resize";
                      }}
                      role="presentation"
                    />
                    <div
                      className="absolute -bottom-[6px] -left-[6px] w-3 h-3 bg-amber-500 border-2 border-white rounded-[3px] z-30 shadow-sm cursor-sw-resize"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture(e.pointerId);
                        mbPointerRef.current = {
                          active: true,
                          handle: "scale",
                          startX: e.clientX,
                          startY: e.clientY,
                          startScale: mbScale,
                          startOffset: mbOffset,
                        };
                        document.body.style.userSelect = "none";
                        document.body.style.cursor = "nesw-resize";
                      }}
                      role="presentation"
                    />
                    <div
                      className="absolute -bottom-[6px] -right-[6px] w-3 h-3 bg-amber-500 border-2 border-white rounded-[3px] z-30 shadow-sm cursor-se-resize"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget.parentElement as HTMLElement | null)?.setPointerCapture(e.pointerId);
                        mbPointerRef.current = {
                          active: true,
                          handle: "scale",
                          startX: e.clientX,
                          startY: e.clientY,
                          startScale: mbScale,
                          startOffset: mbOffset,
                        };
                        document.body.style.userSelect = "none";
                        document.body.style.cursor = "nwse-resize";
                      }}
                      role="presentation"
                    />

                    <button
                      type="button"
                      className="absolute top-3 right-3 bg-white shadow-lg hover:bg-slate-50 text-slate-900 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold border border-slate-200"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMbScale(1.15);
                        setMbOffset({ x: 0, y: 0 });
                      }}
                    >
                      <Icon icon="lucide:refresh-ccw" />
                      RESET
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {tablePages.map((rows, pageIdx) => (
            <div
              key={`table-page-${pageIdx}`}
              data-print-page
              data-table-page="true"
              className="bg-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] relative flex-shrink-0 border border-slate-200 p-8 w-[595px] h-[842px] flex flex-col overflow-hidden"
            >
              <div ref={pageIdx === 0 ? page2Ref : undefined} className="relative w-full h-full">
                <div className="w-full h-full border rounded-2xl overflow-hidden bg-white border-slate-100 flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-200 bg-white/95 backdrop-blur flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Inventory</div>
                      <div className="text-[10px] font-bold text-slate-400">Page {pageIdx + 1}/{tablePages.length}</div>
                    </div>
                    {rows.length > 0 ? (
                      <div className="flex-1 overflow-hidden">
                        <table className="w-full border-collapse table-fixed">
                          <thead className="bg-white">
                            <tr className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                              <th className="text-left font-bold px-3 py-3 border-b border-slate-200 w-[14%]">Image</th>
                              <th className="text-left font-bold px-3 py-3 border-b border-slate-200">Item</th>
                              <th className="text-left font-bold px-3 py-3 border-b border-slate-200 w-[20%]">Ref</th>
                              <th className="text-center font-bold px-3 py-3 border-b border-slate-200 w-[10%]">Qty</th>
                              <th className="text-right font-bold px-3 py-3 border-b border-slate-200 w-[18%]">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, idx) => (
                              <tr key={`${pageIdx}-${row.ref}-${idx}`} className="text-[11px] text-slate-700 align-top">
                                <td className="px-3 py-2.5 border-b border-slate-100">
                                  {row.image ? (
                                    <div className="w-12 h-12 rounded-md border border-slate-200 overflow-hidden bg-white">
                                      <img src={row.image} alt={row.item} className="w-full h-full object-cover" draggable={false} />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-md border border-slate-200 bg-slate-50" />
                                  )}
                                </td>
                                <td className="px-3 py-2.5 border-b border-slate-100 font-semibold leading-5">{row.item || "-"}</td>
                                <td className="px-3 py-2.5 border-b border-slate-100 font-mono text-[10px] break-all">{row.ref || "-"}</td>
                                <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                                  <span className="inline-flex items-center justify-center min-w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                                    {row.qty}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 border-b border-slate-100 text-right font-bold">{row.price || "-"}</td>
                              </tr>
                            ))}
                            {pageIdx === tablePages.length - 1 && (
                              <tr className="text-[12px] text-slate-900 bg-slate-50">
                                <td className="px-3 py-3 border-t border-slate-200" />
                                <td className="px-3 py-3 border-t border-slate-200 font-extrabold uppercase tracking-[0.12em] text-[10px] text-slate-500">
                                  Grand Total
                                </td>
                                <td className="px-3 py-3 border-t border-slate-200" />
                                <td className="px-3 py-3 border-t border-slate-200" />
                                <td className="px-3 py-3 border-t border-slate-200 text-right font-extrabold text-[14px]">
                                  AED {grandTotal.toLocaleString()}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-sm text-slate-500">No inventory rows detected for this moodboard.</div>
                    )}
                </div>

                {pageIdx === tablePages.length - 1 && (
                  <>
                    <div className="absolute bottom-4 right-4 z-20 w-32 h-16">
                      {logoSrc ? (
                        <div className="w-full h-full rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                          <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" draggable={false} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group bg-white shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            logoInputRef.current?.click();
                          }}
                        >
                          <Icon icon="lucide:upload-cloud" className="text-slate-400 group-hover:text-blue-500 text-lg" />
                          <span className="text-[8px] font-bold text-slate-400 group-hover:text-blue-400 uppercase tracking-widest">
                            LOGO UPLOAD
                          </span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await onPickLogo(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

    </div>
  );
}

