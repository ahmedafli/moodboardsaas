"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from "@iconify/react";
import { motion, useMotionValue } from "framer-motion";

export default function InpaintPage() {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<'brush' | 'eraser'>('brush');

  // Drag Mode States
  const [placementMode, setPlacementMode] = useState<'mask' | 'drag'>('mask');
  const [dragScale, setDragScale] = useState(1);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const productInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const productImgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProductImage(url);
    }
  };

  const handleRoomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setRoomImage(url);
      // Clear canvas when new image is uploaded
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const toBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath(); // reset path
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'; // Matching the orange theme

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const generateInpaint = async () => {
    if (!roomImage || !productImage || !canvasRef.current || !imageRef.current) {
      alert("Please upload both images and draw a mask first.");
      return;
    }

    const image = imageRef.current;
    const uiCanvas = canvasRef.current;

    // We no longer artificially round to multiples of 16 because it distorts the layout ratio.
    // Instead, we trust the explicit `size` string we now send to WaveSpeed API.
    // We only scale down mathematically if it strictly exceeds maximum memory sizes (1440px).
    let fluxW = image.naturalWidth;
    let fluxH = image.naturalHeight;
    const MAX_DIM = 1440; // Maintain API safety limits

    if (fluxW > MAX_DIM || fluxH > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / fluxW, MAX_DIM / fluxH);
      fluxW = Math.round(fluxW * ratio);
      fluxH = Math.round(fluxH * ratio);
    }

    // Create a high-res mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = fluxW;
    maskCanvas.height = fluxH;
    const mctx = maskCanvas.getContext('2d');
    if (!mctx) return;

    // Background is black
    mctx.fillStyle = 'black';
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw the UI canvas mask in white, scaled up
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = uiCanvas.width;
    tempCanvas.height = uiCanvas.height;
    const tctx = tempCanvas.getContext('2d');
    if (tctx) {
      tctx.drawImage(uiCanvas, 0, 0);
      const imageData = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] > 0) {
          imageData.data[i] = 255; imageData.data[i + 1] = 255; imageData.data[i + 2] = 255; imageData.data[i + 3] = 255;
        } else {
          imageData.data[i] = 0; imageData.data[i + 1] = 0; imageData.data[i + 2] = 0; imageData.data[i + 3] = 255;
        }
      }
      tctx.putImageData(imageData, 0, 0);
      mctx.drawImage(tempCanvas, 0, 0, maskCanvas.width, maskCanvas.height);
    }

    const maskBase64 = maskCanvas.toDataURL('image/png');

    // Create a NEW image combining the room background AND the orange mask drawn on top
    const orangeMaskedCanvas = document.createElement('canvas');
    orangeMaskedCanvas.width = fluxW;
    orangeMaskedCanvas.height = fluxH;
    const octx = orangeMaskedCanvas.getContext('2d');
    if (!octx) return;

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    const orangeMaskedBase64 = await new Promise<string>((resolve) => {
      bgImg.onload = () => {
        octx.drawImage(bgImg, 0, 0, orangeMaskedCanvas.width, orangeMaskedCanvas.height);
        octx.drawImage(uiCanvas, 0, 0, orangeMaskedCanvas.width, orangeMaskedCanvas.height);
        resolve(orangeMaskedCanvas.toDataURL('image/png'));
      };
      bgImg.src = roomImage;
    });

    let finalCompositeBase64 = orangeMaskedBase64;

    // In Drag Mode, we generate a collage
    if (placementMode === 'drag' && productImgRef.current && canvasRef.current) {
      const dragCanvas = document.createElement('canvas');
      dragCanvas.width = fluxW;
      dragCanvas.height = fluxH;
      const dctx = dragCanvas.getContext('2d');
      if (dctx) {
        const bgImgDrag = new Image();
        bgImgDrag.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          bgImgDrag.onload = () => {
            dctx.drawImage(bgImgDrag, 0, 0, dragCanvas.width, dragCanvas.height);

            const domRect = canvasRef.current!.getBoundingClientRect();
            const scaleX = dragCanvas.width / domRect.width;
            const scaleY = dragCanvas.height / domRect.height;

            const pRect = productImgRef.current!.getBoundingClientRect();

            const destX = (pRect.left - domRect.left) * scaleX;
            const destY = (pRect.top - domRect.top) * scaleY;
            const destW = pRect.width * scaleX;
            const destH = pRect.height * scaleY;

            const productImgObj = new Image();
            productImgObj.crossOrigin = 'anonymous';
            productImgObj.onload = () => {
              dctx.drawImage(productImgObj, destX, destY, destW, destH);
              finalCompositeBase64 = dragCanvas.toDataURL('image/png');
              resolve();
            }
            productImgObj.src = productImage;
          };
          bgImgDrag.src = roomImage;
        });
      }
    }

    setIsGenerating(true);
    const submittedPrompt = userPrompt;
    setUserPrompt("");

    try {
      // Force the raw uploaded room image to also be identically flux-sized so the API doesn't crop it!
      const optimizedRoomCanvas = document.createElement('canvas');
      optimizedRoomCanvas.width = fluxW;
      optimizedRoomCanvas.height = fluxH;
      const orctx = optimizedRoomCanvas.getContext('2d');
      const optimizedRoomBase64 = await new Promise<string>((resolve) => {
        const rImg = new Image();
        rImg.crossOrigin = 'anonymous';
        rImg.onload = () => {
          orctx?.drawImage(rImg, 0, 0, fluxW, fluxH);
          resolve(optimizedRoomCanvas.toDataURL('image/png'));
        };
        rImg.src = roomImage;
      });

      const productBase64 = await toBase64(productImage);

      console.log("Starting generation...");

      const response = await fetch('/api/generate-inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background: optimizedRoomBase64,
          product: productBase64,
          mask: placementMode === 'mask' ? maskBase64 : null,
          composite: finalCompositeBase64,
          prompt: submittedPrompt,
          mode: placementMode,
          width: fluxW,
          height: fluxH
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start generation");
      }

      const data = await response.json();

      if (data.imageUrl) {
        setResults(prev => [data.imageUrl, ...prev]);
        console.log("Generation successful!");
      } else {
        throw new Error("No image returned from the model");
      }

    } catch (err) {
      console.error("Failed to generate:", err);
      alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  // Sync canvas size with image actual displayed area (accounting for object-contain)
  useEffect(() => {
    const syncCanvas = () => {
      if (imageRef.current && canvasRef.current) {
        const img = imageRef.current;
        const canvas = canvasRef.current;

        const containerWidth = img.clientWidth;
        const containerHeight = img.clientHeight;
        const sourceWidth = img.naturalWidth;
        const sourceHeight = img.naturalHeight;

        if (!sourceWidth || !sourceHeight) return;

        const sourceAspect = sourceWidth / sourceHeight;
        const containerAspect = containerWidth / containerHeight;

        let renderWidth, renderHeight, xOffset, yOffset;

        if (containerAspect > sourceAspect) {
          renderHeight = containerHeight;
          renderWidth = renderHeight * sourceAspect;
          xOffset = (containerWidth - renderWidth) / 2;
          yOffset = 0;
        } else {
          renderWidth = containerWidth;
          renderHeight = renderWidth / sourceAspect;
          xOffset = 0;
          yOffset = (containerHeight - renderHeight) / 2;
        }

        canvas.width = renderWidth;
        canvas.height = renderHeight;
        canvas.style.left = `${xOffset}px`;
        canvas.style.top = `${yOffset}px`;
      }
    };

    // Initial sync and observers
    const timer = setTimeout(syncCanvas, 100); // Wait for layout
    window.addEventListener('resize', syncCanvas);
    return () => {
      window.removeEventListener('resize', syncCanvas);
      clearTimeout(timer);
    };
  }, [roomImage]);

  return (
    <div className="flex gap-4 overflow-hidden" style={{ height: '100vh' }}>


      {/* Left Panel: Uploads */}
      <aside className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto no-scrollbar">

        {/* Product Upload */}
        <div className="glass-bg rounded-[2.5rem] p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Icon icon="lucide:shopping-bag" className="text-[#f59e0b]" />
            Product Image
          </h2>
          <div
            onClick={() => productInputRef.current?.click()}
            className="aspect-square relative glass-bg border-2 border-dashed border-white/60 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer group hover:bg-white/60 transition-all overflow-hidden"
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              ref={productInputRef}
              onChange={handleProductImageUpload}
            />
            {productImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={productImage} alt="Uploaded Product" className="w-full h-full object-contain p-4 transition-all" />
            ) : (
              <>
                <Icon icon="lucide:upload-cloud" className="text-3xl text-slate-400 group-hover:text-[#f59e0b] group-hover:scale-110 transition-all" />
                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Upload furniture</p>
                  <p className="text-[10px] text-slate-400">PNG or JPG with transparent bg</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Background Upload */}
        <div className="glass-bg rounded-[2.5rem] p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Icon icon="lucide:layout" className="text-[#f59e0b]" />
            Room Background
          </h2>
          <div
            onClick={() => roomInputRef.current?.click()}
            className="aspect-video relative glass-bg border-2 border-dashed border-white/60 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer group hover:bg-white/60 transition-all overflow-hidden"
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              ref={roomInputRef}
              onChange={handleRoomImageUpload}
            />
            {roomImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={roomImage} alt="Uploaded Room" className="w-full h-full object-cover transition-all" />
            ) : (
              <>
                <Icon icon="lucide:image-plus" className="text-3xl text-slate-400 group-hover:text-[#f59e0b] group-hover:scale-110 transition-all" />
                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Upload Empty Space</p>
                  <p className="text-[10px] text-slate-400">High resolution indoor photos</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Selected Asset Preview (Thumbnail) */}
        <div className="flex-1 glass-bg rounded-[2.5rem] p-6 flex flex-col gap-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Selected Product</span>
          <div className="flex items-center gap-3 p-3 glass-bg rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImage || "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=200&auto=format&fit=crop"}
              alt="Chair"
              className="w-12 h-12 object-contain bg-white rounded-lg p-1"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold truncate max-w-[120px]">
                {productImage ? "Uploaded Image" : "Eames Lounge Chair"}
              </span>
              <span className="text-[10px] text-slate-400">Original PNG</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Center Area: Masking Canvas */}
      <main className="flex-1 flex flex-col gap-4 relative min-h-0 overflow-hidden">

        {/* Placement Mode Toolbar */}
        <div className="self-center shrink-0 glass-bg px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl transition-all hover:scale-105">
          <div className="flex bg-slate-200/50 rounded-lg p-1">
            <button
              onClick={() => setPlacementMode('mask')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${placementMode === 'mask' ? 'bg-white shadow-sm text-[#f59e0b]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mask Mode
            </button>
            <button
              onClick={() => setPlacementMode('drag')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${placementMode === 'drag' ? 'bg-white shadow-sm text-[#f59e0b]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Drag Mode
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {placementMode === 'mask' ? (
            <>
              <div className="flex items-center gap-2 pr-6 border-r border-slate-200/50">
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#f59e0b] text-white shadow-lg shadow-orange-500/20"
                  onClick={clearMask}
                  title="Clear Mask"
                >
                  <Icon icon="lucide:eraser" className="text-lg" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl glass-button text-[#f59e0b]">
                  <Icon icon="lucide:brush" className="text-lg" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Brush</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-24 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#f59e0b]"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scale Item</span>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.1"
                value={dragScale}
                onChange={(e) => setDragScale(parseFloat(e.target.value))}
                className="w-24 h-1 bg-slate-200 rounded-full appearance-none flex-1 cursor-pointer accent-[#f59e0b]"
              />
              <button
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                onClick={() => {
                  setProductImage(null);
                  dragX.set(0);
                  dragY.set(0);
                  setDragScale(1);
                }}
                title="Delete Furniture Item"
              >
                <Icon icon="lucide:trash-2" className="text-lg" />
              </button>
            </div>
          )}
        </div>

        {/* Main Stage */}
        <div ref={containerRef} className="flex-1 glass-bg rounded-[2.5rem] relative overflow-hidden flex items-center justify-center min-h-0">
          {/* Room Background Mockup */}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={roomImage || "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop"}
            alt="Empty Room"
            className="w-full h-full object-contain pointer-events-none"
            onLoad={() => {
              const rect = imageRef.current?.getBoundingClientRect();
              if (rect && canvasRef.current) {
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
              }
            }}
          />

          {/* Mask Canvas */}
          <canvas
            ref={canvasRef}
            className={`absolute animate-in fade-in duration-500 cursor-crosshair touch-none ${placementMode === 'drag' ? 'pointer-events-none' : ''}`}
            style={{ zIndex: 10 }}
            onMouseDown={placementMode === 'mask' ? startDrawing : undefined}
            onMouseMove={placementMode === 'mask' ? draw : undefined}
            onMouseUp={placementMode === 'mask' ? stopDrawing : undefined}
            onMouseLeave={placementMode === 'mask' ? stopDrawing : undefined}
            onTouchStart={placementMode === 'mask' ? startDrawing : undefined}
            onTouchMove={placementMode === 'mask' ? draw : undefined}
            onTouchEnd={placementMode === 'mask' ? stopDrawing : undefined}
          />

          {/* Drag Overlay Mode */}
          {placementMode === 'drag' && productImage && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
              <motion.img
                ref={productImgRef}
                src={productImage}
                alt="Draggable Furniture"
                drag
                dragMomentum={false}
                onDrag={() => {
                  if (!canvasRef.current || !productImgRef.current) return;

                  // Get the exact dimensions of the room image box and the furniture box
                  const cRect = canvasRef.current.getBoundingClientRect();
                  const pRect = productImgRef.current.getBoundingClientRect();

                  // Manually clamp the position so the furniture can never leave the room image
                  let clampedX = dragX.get();
                  let clampedY = dragY.get();

                  if (pRect.left < cRect.left) clampedX += (cRect.left - pRect.left);
                  if (pRect.right > cRect.right) clampedX -= (pRect.right - cRect.right);
                  if (pRect.top < cRect.top) clampedY += (cRect.top - pRect.top);
                  if (pRect.bottom > cRect.bottom) clampedY -= (pRect.bottom - cRect.bottom);

                  dragX.set(clampedX);
                  dragY.set(clampedY);
                }}
                className="pointer-events-auto cursor-grab active:cursor-grabbing border border-dashed border-white/50 shadow-xl"
                style={{ x: dragX, y: dragY, scale: dragScale }}
              />
            </div>
          )}

          {/* Result Preview Label */}
          <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white shadow-sm z-30">
            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Placement Mode: {placementMode.toUpperCase()}</span>
          </div>

        </div>

        {/* Generate Action Bar */}
        <div className="glass-bg rounded-3xl p-6 flex items-center justify-between min-h-[88px] shrink-0 gap-6">

          <div className="flex-1 w-full max-w-2xl relative">
            <Icon icon="lucide:pencil" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Add optional AI instructions (e.g., 'Make it dark wood', 'Modern style')..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full bg-white border-2 border-white/60 shadow-sm rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">AI Engine</span>
              <span className="text-xs font-bold text-slate-600">Pro Studio</span>
            </div>

            <button
              id="btn-generate-ai"
              onClick={generateInpaint}
              disabled={isGenerating || !roomImage || !productImage}
              className={`px-12 py-4 font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-3 group ${isGenerating || !roomImage || !productImage
                ? "bg-slate-300 cursor-not-allowed text-slate-500"
                : "bg-slate-900 hover:bg-black text-white shadow-slate-900/20"
                }`}
            >
              <Icon
                icon={isGenerating ? "lucide:loader-2" : "lucide:sparkles"}
                className={`text-lg transition-transform ${isGenerating ? "animate-spin" : "group-hover:rotate-12"}`}
              />
              <span>{isGenerating ? "Generating..." : "Generate with AI"}</span>
              {!isGenerating && <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] opacity-60 ml-2">12 Credits</span>}
            </button>
          </div>
        </div>

      </main>

      {/* Right Panel: Results History */}
      <aside className="w-80 glass-bg rounded-[2.5rem] flex flex-col overflow-hidden shrink-0">
        <div className="p-6 border-b border-white/20">
          <h2 className="text-lg font-bold tracking-tight mb-1">Final Results</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Generated Gallery</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            {results.map((resUrl, idx) => (
              <div key={idx} className="group relative rounded-3xl overflow-hidden glass-bg p-3 hover:shadow-xl transition-all animate-in zoom-in duration-500">
                <div className="aspect-video rounded-2xl overflow-hidden relative cursor-pointer" onClick={() => setFullscreenImage(resUrl)}>
                  <img src={resUrl} alt={`Result ${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Icon icon="lucide:maximize-2" className="text-white text-2xl" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Result #{results.length - idx}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRoomImage(resUrl);
                        const ctx = canvasRef.current?.getContext('2d');
                        if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        setProductImage(null);
                        dragX.set(0);
                        dragY.set(0);
                        setDragScale(1);
                      }}
                      className="flex items-center gap-1 bg-emerald-500/15 text-emerald-600 rounded-lg px-2 py-1 text-[10px] font-bold uppercase hover:bg-emerald-500/30 transition-colors"
                    >
                      <Icon icon="lucide:check" className="text-xs" /> Approve
                    </button>
                    <button
                      onClick={() => setResults(prev => prev.filter((_, i) => i !== idx))}
                      className="flex items-center gap-1 bg-red-500/15 text-red-500 rounded-lg px-2 py-1 text-[10px] font-bold uppercase hover:bg-red-500/30 transition-colors"
                    >
                      <Icon icon="lucide:x" className="text-xs" /> Reject
                    </button>
                    <a href={resUrl} download target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-500">
                      <Icon icon="lucide:download" />
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {results.length === 0 && !isGenerating && (
              <div className="aspect-video rounded-3xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center gap-2 text-slate-300 opacity-50">
                <Icon icon="lucide:image" className="text-3xl" />
                <span className="text-[10px] font-bold uppercase tracking-widest">No results yet</span>
              </div>
            )}

            {isGenerating && (
              <div className="aspect-video rounded-3xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center gap-3 text-slate-300 animate-pulse">
                <Icon icon="lucide:loader-2" className="text-3xl animate-spin text-[#f59e0b]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Generating Your Vision...</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setFullscreenImage(null)}>
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFullscreenImage(null)} className="absolute -top-2 -right-2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center text-white transition-colors">
              <Icon icon="lucide:x" className="text-xl" />
            </button>
            <img src={fullscreenImage} alt="Fullscreen result" className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain" />
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setRoomImage(fullscreenImage);
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  setProductImage(null);
                  dragX.set(0);
                  dragY.set(0);
                  setDragScale(1);
                  setFullscreenImage(null);
                }}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors shadow-lg"
              >
                <Icon icon="lucide:check-circle" className="text-lg" /> Approve & Use
              </button>
              <button
                onClick={() => {
                  setResults(prev => prev.filter(url => url !== fullscreenImage));
                  setFullscreenImage(null);
                }}
                className="flex items-center gap-2 bg-red-500/80 hover:bg-red-600 text-white rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors shadow-lg"
              >
                <Icon icon="lucide:x-circle" className="text-lg" /> Reject
              </button>
              <a href={fullscreenImage} download target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors shadow-lg backdrop-blur-md">
                <Icon icon="lucide:download" className="text-lg" /> Download
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
