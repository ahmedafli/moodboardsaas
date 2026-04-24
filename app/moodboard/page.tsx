"use client";

import { Icon } from "@iconify/react";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

// Product Type
interface Product {
  id: number;
  productname: string;
  itemcode: string;
  price: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

interface CanvasItem {
  id: string;
  image: string;
  productName: string;
  itemCode: string;
  price: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}


function ProductCard({ product, onAdd }: { product: Product; onAdd: (image: string, product: Product) => void }) {
  // Parsing Images
  // Handle case where string starts and ends with " and \
  const parsedImageString = product.image.replace(/^["\\]+|["\\]+$/g, '');
  const initialImages = parsedImageString.split(',').filter(Boolean);

  const [images, setImages] = useState(initialImages);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const handleRemoveBg = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRemovingBg || images.length === 0) return;

    try {
      setIsRemovingBg(true);
      const currentImageUrl = images[currentImageIndex];

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: currentImageUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove background');
      }

      const data = await response.json();

      if (data.imageUrl && data.imageUrl !== currentImageUrl) {
        // Add cache buster to force the browser to reload the image (bypasses "old white bg" cache)
        const cacheBuster = `&t=${Date.now()}`;
        const finalUrl = data.imageUrl.includes('?') ? `${data.imageUrl}${cacheBuster}` : `${data.imageUrl}?${cacheBuster.slice(1)}`;

        const newImages = [...images];
        newImages[currentImageIndex] = finalUrl;
        setImages(newImages);
      }
    } catch (error) {
      console.error('Error removing background:', error);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative border border-white/50 hover:-translate-y-1">
      <div className="relative w-full aspect-square bg-gray-50/50 overflow-hidden">
        {images.length > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={product.productname}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Icon icon="lucide:image" className="text-3xl opacity-50" />
          </div>
        )}

        {/* Switch Image Controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 text-white"
            >
              <Icon icon="lucide:chevron-left" className="text-lg" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 text-white"
            >
              <Icon icon="lucide:chevron-right" className="text-lg" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>

            {/* Image Counter Badge */}
            <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 tracking-wider">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight" title={product.productname}>
            {product.productname}
          </h3>
          <button
            onClick={() => onAdd(images[currentImageIndex] || '', product)}
            className="text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0"
          >
            <Icon icon="lucide:plus-circle" className="text-xl" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">{product.itemcode}</p>
        <div className="mt-auto flex items-center justify-between">
          <p className="text-lg font-bold text-gray-900">{product.price}</p>
          <button
            onClick={handleRemoveBg}
            disabled={isRemovingBg}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm relative z-10"
          >
            {isRemovingBg ? (
              <>
                <Icon icon="lucide:loader-2" className="animate-spin text-sm" />
                Removing...
              </>
            ) : (
              <>
                <Icon icon="lucide:wand-2" className="text-sm" />
                Remove BG
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface MoodboardPageProps {
  initialCanvasItems?: CanvasItem[];
  moodboardName?: string;
}

export default function MoodboardPage({ initialCanvasItems, moodboardName }: MoodboardPageProps = {}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(initialCanvasItems || []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportBustKey, setExportBustKey] = useState<number | null>(null);

  // Helper to convert Google Drive URLs to high-performance CDN URLs directly in the browser
  const convertGoogleDriveUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'drive.google.com') {
        let fileId: string | null = null;
        if (urlObj.pathname === '/uc' && urlObj.searchParams.has('id')) {
          fileId = urlObj.searchParams.get('id');
        } else if (urlObj.pathname === '/thumbnail' && urlObj.searchParams.has('id')) {
          fileId = urlObj.searchParams.get('id');
        } else if (urlObj.pathname.startsWith('/file/d/')) {
          const match = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (match) fileId = match[1];
        } else if (urlObj.searchParams.has('id')) {
          fileId = urlObj.searchParams.get('id');
        }
        if (fileId) {
          return `https://lh3.googleusercontent.com/d/${fileId}=w2000`;
        }
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  // Helper to safely extract the original URL if a proxied URL was accidentally saved to the DB
  const extractRealUrl = (url: string): string => {
    if (!url) return '';
    try {
      if (url.includes('/api/proxy-image')) {
        // Handle full URL or relative URL safely against dummy base
        const parsed = new URL(url, 'http://localhost');
        const target = parsed.searchParams.get('url');
        if (target) {
          // Re-append any cache busters that were dangling outside the 'url' param
          const tParam = parsed.searchParams.get('t');
          return tParam ? `${target}${target.includes('?') ? '&' : '?'}t=${tParam}` : target;
        }
      }
      return url;
    } catch {
      return url;
    }
  };

  // Helper to ensure all images are routed through our proxy ONLY when exporting to bypass CORS
  const getDisplayImageUrl = (url: string) => {
    if (!url) return '';

    // First strip out any accidental /api/proxy-image cruft stored in DB
    const realSourceUrl = extractRealUrl(url);

    // Convert raw Google Drive URLs to Google's specialized high-speed image CDN
    const optimizedUrl = convertGoogleDriveUrl(realSourceUrl);

    // Bypass proxy during normal viewing for blazing fast direct CDN loads 
    if (!isExporting) return optimizedUrl;

    // During export, we MUST proxy ALL images to securely inject CORS headers. Otherwise, the PDF engine's XHR fetches get blocked, resulting in a blank PDF.
    // Previously, piping 20+ images through '/api/proxy-image' triggered browser 6-connection limits and Node.js timeouts, breaking the images ("Canvas Item" error).
    // To solve both speed and reliability, we route exclusively through the world-class `wsrv.nl` Edge Proxy which handles infinite concurrency and guarantees CORS natively.
    if (!optimizedUrl.startsWith('data:') && optimizedUrl.startsWith('http')) {
      return `https://wsrv.nl/?url=${encodeURIComponent(optimizedUrl)}&t=${exportBustKey || Date.now()}`;
    }

    return optimizedUrl;
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);

      // Dynamically import to avoid SSR issues
      // @ts-ignore
      const domtoimage = (await import('dom-to-image-more')).default;
      const jsPDF = (await import('jspdf')).default;

      // Deselect any item to hide selection rings and rotation handles
      // Set the exportBustKey to force all image URLs to update with a fresh timestamp
      // to bypass the notorious WebKit identical-data-URI foreignObject bug.
      setSelectedItemId(null);
      setExportBustKey(Date.now());
      // Wait for React to re-render the DOM with the new proxied SRCs
      await new Promise(resolve => setTimeout(resolve, 250));

      const moodboardEl = document.getElementById('moodboard-capture');
      const tableEl = document.getElementById('table-capture');

      // Helper to guarantee that all dynamically swapped proxy images have finished downloading
      // before we fire the PDF render engine.
      const waitForImages = async (container: HTMLElement | null) => {
        if (!container) return;
        const images = Array.from(container.querySelectorAll('img'));
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // resolve anyway so export doesn't freeze permanently
          });
        }));
      };

      await waitForImages(moodboardEl);
      await waitForImages(tableEl);

      if (!moodboardEl) return;

      // HTML/DOM-to-image utilities drop 'border-width: 0px' on Safari/Chrome when parsing Tailwind's Preflight,
      // which globally applies border-style: solid to all elements. This creates huge ghost borders.
      // This utility temporarily forces border-style: none on all elements that don't visibly have a border.
      const fixTailwindBorders = (root: HTMLElement) => {
        const els = root.querySelectorAll('*');
        const restored: { el: HTMLElement, val: string }[] = [];
        els.forEach(node => {
          const el = node as HTMLElement;
          const style = window.getComputedStyle(el);
          if (style.borderWidth === '0px' || style.borderWidth === '') {
            restored.push({ el, val: el.style.borderStyle });
            el.style.setProperty('border-style', 'none', 'important');
          }
        });
        return () => restored.forEach(({ el, val }) => el.style.borderStyle = val);
      };

      const fixOverflowHidden = (root: HTMLElement) => {
        const els = root.querySelectorAll('*');
        const restored: { el: HTMLElement, val: string }[] = [];

        // Check root as well
        const allNodes = [root, ...Array.from(els)];

        allNodes.forEach(node => {
          const el = node as HTMLElement;
          const style = window.getComputedStyle(el);
          if (style.overflow === 'hidden' || style.overflowY === 'hidden' || style.overflowX === 'hidden') {
            restored.push({ el, val: el.style.overflow });
            el.style.setProperty('overflow', 'visible', 'important');
          }
        });
        return () => restored.forEach(({ el, val }) => el.style.overflow = val);
      };

      // Page 1: Moodboard (Landscape)
      // dom-to-image-more is used over html-to-image as it correctly manages internal caches
      // and escapes complex Tailwind utilities smoothly
      const scale = 1.5; // Capture at 1.5x resolution for crisp zooming without overwhelming the CPU
      const restoreBorders1 = fixTailwindBorders(moodboardEl);
      const restoreOverflow1 = fixOverflowHidden(moodboardEl);
      const mbWidth = moodboardEl.scrollWidth;
      const mbHeight = moodboardEl.scrollHeight;
      const imgData1 = await domtoimage.toJpeg(moodboardEl, {
        quality: 0.98,
        cacheBust: true,
        bgcolor: '#ffffff',
        width: mbWidth * scale,
        height: mbHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${mbWidth}px`,
          height: `${mbHeight}px`,
          filter: 'none',
          paddingBottom: '20px' // Extra buffer to prevent cropping
        }
      });
      restoreBorders1();
      restoreOverflow1();

      const pdf = new jsPDF({
        orientation: 'l', // Landscape
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidthL = pdf.internal.pageSize.getWidth();
      const pdfHeightL = pdf.internal.pageSize.getHeight();

      const imgProps1 = pdf.getImageProperties(imgData1);
      const ratio1 = imgProps1.width / imgProps1.height;
      let finalW1 = pdfWidthL;
      let finalH1 = pdfWidthL / ratio1;

      if (finalH1 > pdfHeightL) {
        finalH1 = pdfHeightL;
        finalW1 = pdfHeightL * ratio1;
      }

      const x1 = (pdfWidthL - finalW1) / 2;
      const y1 = (pdfHeightL - finalH1) / 2;
      pdf.addImage(imgData1, 'JPEG', x1, y1, finalW1, finalH1);

      // Page 2: Table (Portrait)
      if (tableEl && canvasItems.length > 0) {
        pdf.addPage('a4', 'p'); // Portrait

        const restoreBorders2 = fixTailwindBorders(tableEl);
        const restoreOverflow2 = fixOverflowHidden(tableEl);

        // Add artificial extra space to the actual DOM element right before capture
        const originalPaddingBottom = tableEl.style.paddingBottom;
        tableEl.style.paddingBottom = '60px'; // Give it massive breathing room just for capture

        const tbWidth = tableEl.scrollWidth;
        const tbHeight = tableEl.scrollHeight + 40; // Add extra 40px buffer to height

        const imgData2 = await domtoimage.toJpeg(tableEl, {
          quality: 0.98,
          cacheBust: true,
          bgcolor: '#ffffff',
          width: tbWidth * scale,
          height: tbHeight * scale,
          style: {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${tbWidth}px`,
            height: `${tbHeight}px`,
            filter: 'none',
            paddingBottom: '40px' // Add explicit padding to the clone to force expansion
          },
          filter: (node: Node) => {
            const el = node as HTMLElement;
            if (el.hasAttribute && el.hasAttribute('data-html2canvas-ignore')) {
              return false;
            }
            return true;
          }
        });

        tableEl.style.paddingBottom = originalPaddingBottom;
        restoreBorders2();
        restoreOverflow2();

        const pdfWidthP = pdf.internal.pageSize.getWidth();
        const imgProps2 = pdf.getImageProperties(imgData2);
        const ratio2 = imgProps2.width / imgProps2.height;

        const margin = 15;
        const finalW2 = pdfWidthP - (margin * 2);
        const finalH2 = finalW2 / ratio2;

        pdf.addImage(imgData2, 'JPEG', margin, margin, finalW2, finalH2);
      }

      pdf.save('moodboard-export.pdf');

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExporting(false);
      setExportBustKey(null);
    }
  };

  const openSaveModal = () => {
    if (canvasItems.length === 0) return;
    setSaveName(moodboardName || '');
    setShowSaveModal(true);
  };

  const saveMoodboard = async () => {
    if (isSaving || !saveName.trim()) return;
    if (!currentUserId) {
      alert("Please log in before saving a moodboard.");
      return;
    }
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      const payload = {
        user_id: currentUserId,
        name: saveName.trim(),
        canvas_items: canvasItems,
      };
      const response = await fetch('/api/savemoodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save moodboard');
      setSaveSuccess(true);
      setShowSaveModal(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving moodboard:', error);
      alert('Failed to save moodboard. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToCanvas = (image: string, product: Product) => {
    if (!image) return;
    const maxZ = canvasItems.length > 0 ? Math.max(...canvasItems.map(i => i.zIndex)) : 0;
    const newItem: CanvasItem = {
      id: Math.random().toString(36).substr(2, 9),
      image,
      productName: product.productname,
      itemCode: product.itemcode,
      price: product.price,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 100,
      width: 250,
      height: 250,
      rotation: 0,
      zIndex: maxZ + 1,
    };
    setCanvasItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const bringToFront = (id: string) => {
    setCanvasItems((prev) => {
      const maxZ = Math.max(...prev.map(i => i.zIndex));
      return prev.map(item => item.id === id ? { ...item, zIndex: maxZ + 1 } : item);
    });
    setSelectedItemId(id);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasItems((prev) => prev.filter(item => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleResize = (id: string, deltaSize: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasItems((prev) => prev.map(item => {
      if (item.id === id) {
        // Prevent getting too small or too large
        const newWidth = Math.max(100, Math.min(600, item.width + deltaSize));
        const newHeight = Math.max(100, Math.min(600, item.height + deltaSize));
        return { ...item, width: newWidth, height: newHeight };
      }
      return item;
    }));
  };

  const handleRotate = (id: string, deltaRotation: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasItems((prev) => prev.map(item =>
      item.id === id ? { ...item, rotation: item.rotation + deltaRotation } : item
    ));
  };

  // --- Smooth Rotation Logic using refs to avoid re-renders ---
  const [isRotating, setIsRotating] = useState(false);
  const startAngleRef = useRef(0);
  const rotatingItemIdRef = useRef<string | null>(null);
  const canvasItemsRef = useRef(canvasItems);

  // Keep the ref in sync with state
  useEffect(() => {
    canvasItemsRef.current = canvasItems;
  }, [canvasItems]);

  const startRotate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const item = canvasItems.find(i => i.id === id);
    if (!item) return;

    rotatingItemIdRef.current = id;

    // Get the container's bounding rect for accurate center calculation
    const containerRect = containerRef.current?.getBoundingClientRect();
    const offsetX = containerRect?.left || 0;
    const offsetY = containerRect?.top || 0;

    const centerX = offsetX + item.x + item.width / 2;
    const centerY = offsetY + item.y + item.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    startAngleRef.current = Math.atan2(dy, dx) * (180 / Math.PI);

    setIsRotating(true);
  };

  useEffect(() => {
    if (!isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      const itemId = rotatingItemIdRef.current;
      if (!itemId) return;

      const items = canvasItemsRef.current;
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const containerRect = containerRef.current?.getBoundingClientRect();
      const offsetX = containerRect?.left || 0;
      const offsetY = containerRect?.top || 0;

      const centerX = offsetX + item.x + item.width / 2;
      const centerY = offsetY + item.y + item.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      const angleDiff = currentAngle - startAngleRef.current;
      startAngleRef.current = currentAngle;

      setCanvasItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, rotation: i.rotation + angleDiff } : i
      ));
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      rotatingItemIdRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isRotating]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };

    fetchCurrentUser();
  }, [supabase]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/getallproducts");
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <main className="flex-1 min-h-[120vh] glass-bg rounded-[2.5rem] flex flex-col p-6 md:p-10 lg:p-12 overflow-y-auto relative z-0">
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        {canvasItems.length > 0 && (
          <>
            <button
              onClick={openSaveModal}
              disabled={isSaving}
              className={`px-5 py-2.5 ${saveSuccess
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30'
                } text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <Icon icon="lucide:loader-2" className="animate-spin text-lg" />
              ) : saveSuccess ? (
                <Icon icon="lucide:check" className="text-lg" />
              ) : (
                <Icon icon="lucide:save" className="text-lg" />
              )}
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Icon icon="lucide:loader-2" className="animate-spin text-lg" />
              ) : (
                <Icon icon="lucide:download" className="text-lg" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </>
        )}
        <button
          id="close-view-btn"
          className="w-10 h-10 glass-button rounded-full flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer border-none shadow-sm"
        >
          <Icon icon="lucide:x" className="text-xl opacity-60" />
        </button>
      </div>

      <div className="flex-1 flex flex-col w-full h-full gap-8 max-w-[1600px] mx-auto">
        {/* Moodboard builder Plan Container */}

        {/* Canvas Scroll Wrapper explicitly added so smaller PC screens won't squash or crop the fixed-size board */}
        <div className="w-full overflow-x-auto pb-4">
          <div
            id="moodboard-capture"
            ref={containerRef}
            className="w-[1600px] h-[1200px] bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 flex flex-col relative overflow-hidden border border-white/50 shrink-0"
            style={{ minWidth: '1600px', minHeight: '1200px' }}
            onClick={() => setSelectedItemId(null)}
          >
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

            {canvasItems.map((item) => (
              <motion.div
                key={item.id}
                drag
                dragConstraints={containerRef}
                dragMomentum={false}
                dragElastic={0}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => bringToFront(item.id)}
                onDragEnd={(_, info) => {
                  setCanvasItems(prev => prev.map(i =>
                    i.id === item.id
                      ? { ...i, x: i.x + info.offset.x, y: i.y + info.offset.y }
                      : i
                  ));
                }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  bringToFront(item.id);
                }}
                whileDrag={{ cursor: "grabbing" }}
                className={`absolute bg-transparent group ${selectedItemId === item.id
                  ? 'ring-2 ring-indigo-400 ring-offset-2 z-[999]'
                  : 'hover:ring-1 hover:ring-gray-300 cursor-grab'
                  } transition-shadow`}
                style={{
                  width: item.width,
                  height: item.height,
                  rotate: item.rotation,
                  zIndex: selectedItemId === item.id ? 999 : item.zIndex,
                  x: item.x,
                  y: item.y
                }}
              >
                <img src={getDisplayImageUrl(item.image)} alt="Canvas Item" className="w-full h-full object-cover pointer-events-none rounded-[4px]" draggable="false" />

                {/* Corner Rotation Handles */}
                {selectedItemId === item.id && (
                  <>
                    <div
                      className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'black\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M21 2v6h-6\\'></path><path d=\\'M21 13a9 9 0 1 1-3-7.7L21 8\\'></path></svg>')_12_12,auto] z-[1000] hover:scale-125 hover:bg-indigo-50 transition-transform shadow-md flex items-center justify-center p-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => startRotate(item.id, e)}
                    >
                      <Icon icon="lucide:rotate-ccw" className="text-[10px] text-indigo-500 font-bold" />
                    </div>
                    <div
                      className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'black\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M3 2v6h6\\'></path><path d=\\'M3 13a9 9 0 1 0 3-7.7L3 8\\'></path></svg>')_12_12,auto] z-[1000] hover:scale-125 hover:bg-indigo-50 transition-transform shadow-md flex items-center justify-center p-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => startRotate(item.id, e)}
                    >
                      <Icon icon="lucide:rotate-cw" className="text-[10px] text-indigo-500 font-bold" />
                    </div>
                    <div
                      className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'black\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M21 22v-6h-6\\'></path><path d=\\'M21 11a9 9 0 1 0-3 7.7L21 16\\'></path></svg>')_12_12,auto] z-[1000] hover:scale-125 hover:bg-indigo-50 transition-transform shadow-md flex items-center justify-center p-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => startRotate(item.id, e)}
                    >
                      <Icon icon="lucide:rotate-ccw" className="text-[10px] text-indigo-500 font-bold" />
                    </div>
                    <div
                      className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'black\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M3 22v-6h6\\'></path><path d=\\'M3 11a9 9 0 1 1 3 7.7L3 16\\'></path></svg>')_12_12,auto] z-[1000] hover:scale-125 hover:bg-indigo-50 transition-transform shadow-md flex items-center justify-center p-1"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => startRotate(item.id, e)}
                    >
                      <Icon icon="lucide:rotate-cw" className="text-[10px] text-indigo-500 font-bold" />
                    </div>
                  </>
                )}

                {/* Item Controls Overlay */}
                {selectedItemId === item.id && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md rounded-2xl flex items-center justify-center gap-1.5 p-1.5 shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                    <div className="flex gap-1.5 px-2 py-1 rounded-xl bg-white/10">
                      <button
                        onClick={(e) => handleResize(item.id, -20, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                        title="Decrease Size"
                      >
                        <Icon icon="lucide:minus" className="text-sm" />
                      </button>
                      <div className="w-px h-6 bg-white/20 my-auto" />
                      <button
                        onClick={(e) => handleResize(item.id, 20, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                        title="Increase Size"
                      >
                        <Icon icon="lucide:plus" className="text-sm" />
                      </button>
                    </div>

                    <div className="flex gap-1.5 px-2 py-1 rounded-xl bg-white/10 hidden">
                      <button
                        onClick={(e) => handleRotate(item.id, -15, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                        title="Rotate Left"
                      >
                        <Icon icon="lucide:rotate-ccw" className="text-sm" />
                      </button>
                      <div className="w-px h-6 bg-white/20 my-auto" />
                      <button
                        onClick={(e) => handleRotate(item.id, 15, e)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                        title="Rotate Right"
                      >
                        <Icon icon="lucide:rotate-cw" className="text-sm" />
                      </button>
                    </div>

                    <button
                      onClick={(e) => handleRemove(item.id, e)}
                      className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500 flex items-center justify-center text-red-300 hover:text-white ml-2 transition-all group/delete"
                      title="Remove item"
                    >
                      <Icon icon="lucide:trash-2" className="text-lg group-hover/delete:scale-110 transition-transform" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}

            {canvasItems.length === 0 && (
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center flex-1">
                <div className="w-20 h-20 bg-indigo-50/80 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white">
                  <Icon icon="lucide:layout-dashboard" className="text-4xl text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold border-b-2 border-transparent bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-500 mb-3">
                  Moodboard Canvas
                </h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Drag and drop products or click the plus icon to start bringing your vision to life.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Table */}
        {canvasItems.length > 0 && (
          <div id="table-capture" className="w-full bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-lg border border-white/60 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
                  <Icon icon="lucide:table" className="text-xl" />
                </span>
                Selected Products
              </h2>
              <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm border border-white/50">
                <Icon icon="lucide:layers" className="text-emerald-500" />
                {canvasItems.length} {canvasItems.length === 1 ? 'Item' : 'Items'}
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/60 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 backdrop-blur-md">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Product</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Item Code</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Count</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Price</th>
                    <th data-html2canvas-ignore="true" className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.values(
                    canvasItems.reduce((acc, item) => {
                      const key = item.itemCode + '-' + item.image;
                      if (!acc[key]) {
                        acc[key] = { ...item, count: 1, ids: [item.id] };
                      } else {
                        acc[key].count += 1;
                        acc[key].ids.push(item.id);
                      }
                      return acc;
                    }, {} as Record<string, CanvasItem & { count: number; ids: string[] }>)
                  ).map((group) => (
                    <tr key={group.itemCode + '-' + group.image} className="bg-white/60 hover:bg-indigo-50/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm flex-shrink-0">
                            <img src={group.image.startsWith('data:') ? group.image : getDisplayImageUrl(group.image)} alt={group.productName} className="w-full h-full object-cover" loading="eager" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{group.productName}</p>
                            <p data-html2canvas-ignore="true" className="text-xs text-gray-400 mt-0.5">Added to canvas</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center bg-gray-100/80 text-gray-600 text-xs font-mono font-medium px-3 py-1.5 rounded-lg">
                          {group.itemCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                          {group.count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {(() => {
                            const numericPrice = parseFloat(group.price.replace(/[^0-9.]/g, ''));
                            const currencyPrefix = group.price.replace(/[0-9.,\s]/g, '').trim();
                            const total = (numericPrice * group.count).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return `${currencyPrefix} ${total}`;
                          })()}
                        </span>
                        {group.count > 1 && (
                          <p className="text-xs text-gray-400 mt-0.5">{group.price} each</p>
                        )}
                      </td>
                      <td data-html2canvas-ignore="true" className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCanvasItems(prev => prev.filter(i => !group.ids.includes(i.id)));
                            if (selectedItemId && group.ids.includes(selectedItemId)) setSelectedItemId(null);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Icon icon="lucide:trash-2" className="text-sm" />
                          Remove All
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50/50 backdrop-blur-md border-t-2 border-emerald-100">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-700">
                      Total Estimate:
                    </td>
                    <td colSpan={2} className="px-6 py-4 text-left">
                      <span className="text-xl font-bold border-b-2 border-transparent bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-indigo-600">
                        {(() => {
                          const allTotals = Object.values(
                            canvasItems.reduce((acc, item) => {
                              const key = item.itemCode + '-' + item.image;
                              if (!acc[key]) {
                                acc[key] = { ...item, count: 1 };
                              } else {
                                acc[key].count += 1;
                              }
                              return acc;
                            }, {} as Record<string, CanvasItem & { count: number }>)
                          ).map(group => {
                            const numericPrice = parseFloat(group.price.replace(/[^0-9.]/g, ''));
                            return numericPrice * group.count;
                          });

                          const grandTotal = allTotals.reduce((sum, val) => sum + val, 0);

                          // Assuming all items use the same currency, grab the first one's currency string
                          const firstCurrency = canvasItems.length > 0
                            ? canvasItems[0].price.replace(/[0-9.,\s]/g, '').trim()
                            : '';

                          return `${firstCurrency} ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Products Display Section */}
        <div className="w-full bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-lg border border-white/60 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
                  <Icon icon="lucide:shopping-bag" className="text-xl" />
                </span>
                Available Products
              </h2>
              <p className="text-gray-500 mt-2 text-sm ml-1">Browse and select items to add to your moodboard</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm border border-white/50">
              <Icon icon="lucide:package" className="text-indigo-500" />
              {products.length} {products.length === 1 ? 'Item' : 'Items'} Found
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-24 gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-200 rounded-full blur animate-ping opacity-50"></div>
                <Icon icon="lucide:loader-2" className="animate-spin text-5xl text-indigo-500 relative z-10" />
              </div>
              <p className="text-gray-500 font-medium animate-pulse">Syncing catalog...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={handleAddToCanvas} />
              ))}
            </div>
          ) : (
            <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-white flex flex-col items-center justify-center py-20 px-4 text-center shadow-inner">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                <Icon icon="lucide:package-open" className="text-5xl text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Products Available</h3>
              <p className="text-gray-500 max-w-sm">We couldn't find any products in your sync source right now. Please check your data source.</p>
            </div>
          )}
        </div>
      </div>
      {/* Save Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 p-8 w-full max-w-md mx-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Icon icon="lucide:save" className="text-xl text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Save Moodboard</h3>
                <p className="text-sm text-gray-500">Give your moodboard a name</p>
              </div>
            </div>

            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && saveName.trim()) saveMoodboard(); }}
              placeholder="e.g. Living Room Inspiration"
              autoFocus
              className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all text-sm"
            />

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveMoodboard}
                disabled={isSaving || !saveName.trim()}
                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSaving ? (
                  <>
                    <Icon icon="lucide:loader-2" className="animate-spin text-lg" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:check" className="text-lg" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
