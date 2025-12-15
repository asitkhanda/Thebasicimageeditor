import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop as CropType, type PixelCrop, centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { 
  Crop, 
  Sliders, 
  PenTool, 
  Eye, 
  Download, 
  RotateCw, 
  Undo2, 
  Redo2,
  Image as ImageIcon,
  Trash2,
  Palette,
  Square,
  Monitor,
  Maximize,
  Smartphone,
  RectangleHorizontal,
  RectangleVertical,
  Wand2,
  Loader2,
  GripVertical,
  ArrowRightLeft,
  Shrink,
  Check,
  X
} from 'lucide-react';
import { 
  createImage, 
  getCroppedImg, 
  spotFix,
  removeRedEye,
  removeImageBackground
} from '../../lib/image-processing';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { INSTAGRAM_FILTERS, type Filter } from '../../lib/filters';

// Apple Liquid Glass / VisionOS inspired colors
// Base: dark, vibrant, translucent
// Glass: bg-white/10 backdrop-blur-xl border-white/10

type FilterValues = {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
  blur: number;
  hueRotate: number;
};

const DEFAULT_FILTERS: FilterValues = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  hueRotate: 0,
};

type Mode = 'crop' | 'adjust' | 'filter' | 'draw' | 'repair' | 'remove-bg' | 'compress' | null;

interface ImageEditorProps {
  initialImage: string;
  onClose: () => void;
}

export default function ImageEditor({ initialImage, onClose }: ImageEditorProps) {
  const [imageSrc, setImageSrc] = useState<string>(initialImage);
  const [mode, setMode] = useState<Mode>(null);
  
  // Adjustment State
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  
  // History
  type HistoryState = { src: string; filters: FilterValues };
  const [history, setHistory] = useState<HistoryState[]>([{ src: initialImage, filters: DEFAULT_FILTERS }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Drawing state
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawSize, setDrawSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Repair state
  const [repairType, setRepairType] = useState<'blemish' | 'redeye'>('blemish');
  
  // Crop state
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  
  // BG Removal state
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  
  // Compression State
  const [compressSettings, setCompressSettings] = useState({
    format: 'image/jpeg',
    quality: 0.8
  });
  const [compressedPreview, setCompressedPreview] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [comparePos, setComparePos] = useState(50); // Percentage
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Save state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveFormat, setSaveFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [saveQuality, setSaveQuality] = useState(0.9);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for interaction
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (mode !== 'crop' && imageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
      };
    }
  }, [imageSrc, mode]);

  // Handle Compression Preview
  useEffect(() => {
    if (mode === 'compress' && canvasRef.current) {
        const updateCompression = async () => {
            setIsCompressing(true);
            const canvas = canvasRef.current;
            if (!canvas) return;

            // 1. Generate High-Quality "Original" Reference (PNG)
            // We do this once or if filters change, to ensure "Before" view matches current edits
            canvas.toBlob((blob) => {
                if(blob) {
                    setOriginalSize(blob.size);
                    setOriginalPreview(URL.createObjectURL(blob));
                }
            }, 'image/png');

            // 2. Generate Compressed Version
            canvas.toBlob((blob) => {
                if (blob) {
                    setCompressedSize(blob.size);
                    const url = URL.createObjectURL(blob);
                    setCompressedPreview(url);
                }
                setIsCompressing(false);
            }, compressSettings.format, compressSettings.quality);
        };
        
        const timeout = setTimeout(updateCompression, 100); // Debounce
        return () => clearTimeout(timeout);
    }
  }, [mode, compressSettings, filters, rotation, flip, crop]); // Add transform deps

  const getFilterString = (currentFilters: FilterValues) => {
    return `brightness(${currentFilters.brightness}%) contrast(${currentFilters.contrast}%) saturate(${currentFilters.saturation}%) sepia(${currentFilters.sepia}%) grayscale(${currentFilters.grayscale}%) blur(${currentFilters.blur}px) hue-rotate(${currentFilters.hueRotate}deg)`;
  };

  const addToHistory = (newSrc: string, newFilters: FilterValues = filters) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ src: newSrc, filters: newFilters });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setImageSrc(newSrc);
    setFilters(newFilters);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const state = history[historyIndex - 1];
      setImageSrc(state.src);
      setFilters(state.filters);
      setLastAppliedFilters(state.filters);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const state = history[historyIndex + 1];
      setImageSrc(state.src);
      setFilters(state.filters);
      setLastAppliedFilters(state.filters);
    }
  };

  // --- Canvas Interactions ---

  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!mode || mode === 'crop' || mode === 'adjust' || mode === 'filter') return;
    
    setIsDrawing(true);
    const pos = getMousePos(e);
    lastPos.current = pos;

    if (mode === 'repair') {
      const canvas = canvasRef.current;
      if (canvas) {
        if (repairType === 'redeye') {
            removeRedEye(canvas, pos.x, pos.y, drawSize);
        } else {
            spotFix(canvas, pos.x, pos.y, drawSize * 2);
        }
        // We don't add to history on every click for performance, but we could. 
        // Ideally we wait for mouse up.
        // For now, let's add to history on mouse up.
      }
    }
  };

  const moveInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos.current || !canvasRef.current) return;
    
    if (mode === 'draw') {
      const ctx = canvasRef.current.getContext('2d');
      const pos = getMousePos(e);
      
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      lastPos.current = pos;
    }
  };

  const endInteraction = () => {
    if (isDrawing) {
      if (canvasRef.current) {
        addToHistory(canvasRef.current.toDataURL(), filters);
      }
    }
    setIsDrawing(false);
    lastPos.current = null;
  };

  // --- Actions ---

  const applyFilters = async () => {
      setLastAppliedFilters(filters);
      addToHistory(imageSrc, filters);
  };

  const applyPreset = (filter: Filter) => {
      const newFilters = { ...filters, ...filter.filter };
      setFilters(newFilters);
  };
  
  const hasChanges = JSON.stringify(filters) !== JSON.stringify(lastAppliedFilters);
  
  const handleSaveClick = () => {
    setIsSaveDialogOpen(true);
  };

  const performDownload = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = await createImage(imageSrc);
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    if (ctx) {
        ctx.filter = getFilterString(filters);
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `edited-image.${saveFormat}`;
        link.href = canvas.toDataURL(`image/${saveFormat}`, saveQuality);
        link.click();
        setIsSaveDialogOpen(false);
    }
  };

  const handleDownloadCompressed = () => {
    if (!compressedPreview) return;
    const link = document.createElement('a');
    const ext = compressSettings.format.split('/')[1];
    link.download = `compressed-image.${ext === 'jpeg' ? 'jpg' : ext}`;
    link.href = compressedPreview;
    link.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onAspectChange = (value: number | undefined) => {
      setAspect(value);
      if (value && imgRef.current) {
          const { width, height } = imgRef.current;
          const crop = centerCrop(
              makeAspectCrop(
                  {
                      unit: '%',
                      width: 90,
                  },
                  value,
                  width,
                  height
              ),
              width,
              height
          );
          setCrop(crop);
          setCompletedCrop(convertToPixelCrop(crop, width, height));
      }
  };

  const performCrop = async () => {
      if (!imgRef.current) return;

      try {
          const img = imgRef.current;
          const scaleX = img.naturalWidth / img.width;
          const scaleY = img.naturalHeight / img.height;
          
          const finalCrop = completedCrop ? {
              x: completedCrop.x * scaleX,
              y: completedCrop.y * scaleY,
              width: completedCrop.width * scaleX,
              height: completedCrop.height * scaleY
          } : null;

          const cropped = await getCroppedImg(imageSrc, finalCrop, rotation, flip);
          if (cropped) {
              addToHistory(cropped, filters);
              setRotation(0);
              setFlip({ horizontal: false, vertical: false });
              setCrop(undefined);
              setCompletedCrop(undefined);
              setMode(null);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleRemoveBg = async () => {
      setIsRemovingBg(true);
      try {
          // Delay slightly to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 100));
          const newSrc = await removeImageBackground(imageSrc);
          addToHistory(newSrc, filters);
          setMode(null);
      } catch (error) {
          console.error("BG Removal failed", error);
          alert("Could not remove background. Please try again or use a simpler image.");
      } finally {
          setIsRemovingBg(false);
      }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden selection:bg-pink-500/30 font-sans bg-[url('https://images.unsplash.com/photo-1712259368727-382cbf35bb6e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl" />

      {/* Loading Overlay for BG Removal */}
      {isRemovingBg && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-white/10 border border-white/20 p-8 rounded-3xl flex flex-col items-center shadow-2xl">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Removing Background</h3>
                <p className="text-white/60 text-sm text-center max-w-xs">
                    This runs entirely on your device using AI. The first time may take a few seconds to load models.
                </p>
            </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="relative z-50 flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="fixed top-[4.5rem] left-4 md:top-auto md:bottom-6 md:left-6 z-50 rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md bg-[rgba(255,53,53,0.1)]">
             <Trash2 className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium text-white/50 uppercase tracking-widest hidden md:inline-block">Essential Editor Panel</span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-md">
                <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex === 0} className="rounded-full h-9 w-9 hover:bg-white/10 text-white/80 hover:text-white">
                    <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex === history.length - 1} className="rounded-full h-9 w-9 hover:bg-white/10 text-white/80 hover:text-white">
                    <Redo2 className="h-4 w-4" />
                </Button>
            </div>
            <Button onClick={handleSaveClick} disabled={historyIndex === 0} className="rounded-full bg-white text-black hover:bg-white/90 px-6 font-semibold shadow-lg shadow-white/10 border-0 disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="mr-2 h-4 w-4" /> Save
            </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="relative flex-1 flex overflow-hidden z-10">
        {/* Floating Toolbar (Left/Bottom) */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 flex flex-row md:flex-col gap-4 z-20 w-[90vw] md:w-auto justify-center md:justify-start">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-3 rounded-2xl md:rounded-[2rem] shadow-2xl flex flex-row md:flex-col gap-3 overflow-x-auto no-scrollbar w-full md:w-auto justify-between md:justify-start">
                <ToolButton icon={Crop} label="Crop" active={mode === 'crop'} onClick={() => setMode('crop')} />
                <ToolButton icon={Sliders} label="Adjust" active={mode === 'adjust'} onClick={() => setMode('adjust')} />
                <ToolButton icon={Palette} label="Filters" active={mode === 'filter'} onClick={() => setMode('filter')} />
                <ToolButton icon={PenTool} label="Draw" active={mode === 'draw'} onClick={() => setMode('draw')} />
                <ToolButton icon={Eye} label="Repair" active={mode === 'repair'} onClick={() => setMode('repair')} />
                <ToolButton icon={Wand2} label="Remove BG" active={mode === 'remove-bg'} onClick={() => setMode('remove-bg')} />
                <ToolButton icon={Shrink} label="Compress" active={mode === 'compress'} onClick={() => setMode('compress')} />
            </div>
        </div>

        {/* Canvas Area (Center) */}
        <div 
            ref={containerRef}
            className="flex-1 relative flex items-center justify-center overflow-hidden p-4 pb-32 md:p-12 md:pl-32 md:pr-[24rem]"
            style={{ cursor: (mode === 'draw' || mode === 'repair') ? 'crosshair' : 'default' }}
        >
            {mode === 'crop' ? (
               <>
                {/* Ensure CSS is loaded */}
                <link rel="stylesheet" href="https://unpkg.com/react-image-crop/dist/ReactCrop.css" />
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  className="shadow-2xl rounded-lg ring-1 ring-white/20"
                  style={{
                      transform: `rotate(${rotation}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
                      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      position: 'relative',
                      maxHeight: '75vh',
                      maxWidth: '100%'
                  }}
                >
                   <img 
                     ref={imgRef}
                     src={imageSrc} 
                     alt="Crop target"
                     style={{ 
                         filter: getFilterString(filters),
                         maxHeight: '75vh',
                         maxWidth: '100%',
                         display: 'block'
                     }} 
                   />
                </ReactCrop>
               </>
            ) : (
                <div className="relative shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10 group">
                    <div 
                        className="absolute inset-0 pointer-events-none -z-10 opacity-20"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23808080' fill-opacity='1'%3E%3Cpath d='M0 0h10v10H0zM10 10h10v10H10z'/%3E%3C/g%3E%3C/svg%3E")`
                        }}
                    />
                    
                    {/* Main Canvas */}
                    <canvas 
                        ref={canvasRef}
                        className="max-w-full max-h-[75vh] object-contain block"
                        style={{ 
                            filter: getFilterString(filters),
                            transform: `rotate(${rotation}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
                            display: mode === 'compress' ? 'none' : 'block' // Hide default canvas in compress mode to use custom view
                        }}
                        onMouseDown={startInteraction}
                        onMouseMove={moveInteraction}
                        onMouseUp={endInteraction}
                        onMouseLeave={endInteraction}
                        onTouchStart={startInteraction}
                        onTouchMove={moveInteraction}
                        onTouchEnd={endInteraction}
                    />

                    {/* Compression Comparison View */}
                    {mode === 'compress' && compressedPreview && originalPreview && canvasRef.current && (
                        <div 
                            className="relative max-w-full max-h-[75vh] overflow-hidden select-none shadow-2xl rounded-lg ring-1 ring-white/10"
                            style={{ 
                                width: canvasRef.current.width, 
                                height: canvasRef.current.height,
                                maxWidth: '100%',
                                aspectRatio: `${canvasRef.current.width} / ${canvasRef.current.height}`
                            }}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                setComparePos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                            }}
                            onTouchMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.touches[0].clientX - rect.left;
                                setComparePos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                            }}
                        >
                            {/* "After" Image (Background) - Shows fully */}
                            <img 
                                src={compressedPreview} 
                                className="absolute inset-0 w-full h-full object-contain select-none" 
                                draggable={false}
                                style={{
                                    backgroundColor: '#ffffff',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M0 0h10v10H0zM10 10h10v10H10z'/%3E%3C/g%3E%3C/svg%3E")`
                                }}
                                alt="After" 
                            />
                            







                            {/* RE-IMPLEMENTATION: The simpler clip-path approach */}
                            <img 
                                src={originalPreview} 
                                className="absolute inset-0 w-full h-full object-contain select-none" 
                                draggable={false}
                                style={{
                                    clipPath: `polygon(0 0, ${comparePos}% 0, ${comparePos}% 100%, 0 100%)`
                                }}
                                alt="Before" 
                            />

                            {/* Slider Handle (Visual only) */}
                            <div 
                                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                style={{ left: `${comparePos}%` }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-black ring-2 ring-black/10">
                                    <ArrowRightLeft className="w-4 h-4" />
                                </div>
                            </div>
                            
                            {/* Labels */}
                            <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md pointer-events-none z-30">
                                Original ({formatSize(originalSize)})
                            </div>
                            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md pointer-events-none z-30">
                                Compressed ({formatSize(compressedSize)})
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Properties Panel (Right Sidebar / Bottom Sheet) */}
        <div className={cn(
            "absolute bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden transition-all z-30",
            "md:right-6 md:top-6 md:bottom-6 md:w-80 md:rounded-[2.5rem] md:left-auto md:h-auto", // Desktop
            "left-0 right-0 bottom-0 h-[50vh] rounded-t-[2rem]", // Mobile
            !mode ? "hidden md:flex" : "flex"
        )}>
            {!mode ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40 text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-lg font-medium text-white/80">No Tool Selected</p>
                    <p className="text-sm mt-2">Select a tool from the left bar to start editing your masterpiece.</p>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setMode(null)}
                                className="md:hidden h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                            <h3 className="font-semibold text-white text-lg capitalize">{mode.replace('-', ' ')}</h3>
                        </div>
                        {(mode === 'adjust' || mode === 'filter') && (
                             <Button 
                                size="sm" 
                                className="h-8 text-xs rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed" 
                                onClick={applyFilters}
                                disabled={!hasChanges}
                             >
                                <Check className="w-3 h-3 mr-1" /> Apply
                             </Button>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {mode === 'crop' && (
                            <div className="space-y-8">
                                <div>
                                    <Label className="mb-4 block text-xs font-bold uppercase tracking-widest text-white/40">Aspect Ratio</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <AspectRatioBtn icon={Maximize} label="Free" active={aspect === undefined} onClick={() => onAspectChange(undefined)} />
                                        <AspectRatioBtn icon={Square} label="1:1" active={aspect === 1} onClick={() => onAspectChange(1)} />
                                        <AspectRatioBtn icon={Monitor} label="16:9" active={aspect === 16/9} onClick={() => onAspectChange(16/9)} />
                                        <AspectRatioBtn icon={Smartphone} label="9:16" active={aspect === 9/16} onClick={() => onAspectChange(9/16)} />
                                        <AspectRatioBtn icon={RectangleHorizontal} label="4:3" active={aspect === 4/3} onClick={() => onAspectChange(4/3)} />
                                        <AspectRatioBtn icon={RectangleVertical} label="3:2" active={aspect === 3/2} onClick={() => onAspectChange(3/2)} />
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-4 block text-xs font-bold uppercase tracking-widest text-white/40">Transform</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="outline" className="h-12 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" onClick={() => setRotation(r => r - 90)}>
                                            <RotateCw className="mr-2 h-4 w-4 rotate-180" /> -90°
                                        </Button>
                                        <Button variant="outline" className="h-12 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" onClick={() => setRotation(r => r + 90)}>
                                            <RotateCw className="mr-2 h-4 w-4" /> +90°
                                        </Button>
                                        <Button variant="outline" className="h-12 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" onClick={() => setFlip(f => ({...f, horizontal: !f.horizontal}))}>
                                            Flip H
                                        </Button>
                                        <Button variant="outline" className="h-12 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white" onClick={() => setFlip(f => ({...f, vertical: !f.vertical}))}>
                                            Flip V
                                        </Button>
                                    </div>
                                </div>

                                <Button className="w-full rounded-2xl py-6 text-base mt-6 bg-white text-black hover:bg-white/90 font-semibold shadow-lg shadow-white/10" onClick={performCrop}>
                                    Apply Crop
                                </Button>
                            </div>
                        )}

                        {mode === 'adjust' && (
                            <div className="space-y-8">
                                <FilterSlider 
                                    label="Brightness" 
                                    value={filters.brightness} 
                                    min={0} max={200} 
                                    onChange={v => setFilters({...filters, brightness: v})} 
                                />
                                <FilterSlider 
                                    label="Contrast" 
                                    value={filters.contrast} 
                                    min={0} max={200} 
                                    onChange={v => setFilters({...filters, contrast: v})} 
                                />
                                <FilterSlider 
                                    label="Saturation" 
                                    value={filters.saturation} 
                                    min={0} max={200} 
                                    onChange={v => setFilters({...filters, saturation: v})} 
                                />
                                <FilterSlider 
                                    label="Blur" 
                                    value={filters.blur} 
                                    min={0} max={10} 
                                    onChange={v => setFilters({...filters, blur: v})} 
                                />
                                <FilterSlider 
                                    label="Sepia" 
                                    value={filters.sepia} 
                                    min={0} max={100} 
                                    onChange={v => setFilters({...filters, sepia: v})} 
                                />
                                <FilterSlider 
                                    label="Hue Rotate" 
                                    value={filters.hueRotate} 
                                    min={0} max={360} 
                                    onChange={v => setFilters({...filters, hueRotate: v})} 
                                />
                            </div>
                        )}

                        {mode === 'filter' && (
                            <div className="grid grid-cols-2 gap-4">
                                {INSTAGRAM_FILTERS.map((f) => (
                                    <FilterPreview 
                                        key={f.name} 
                                        filter={f} 
                                        imageSrc={imageSrc} 
                                        onClick={() => setFilters({ ...lastAppliedFilters, ...f.filter })}
                                    />
                                ))}
                            </div>
                        )}

                        {mode === 'compress' && (
                            <div className="space-y-8">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="flex justify-between items-end mb-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Estimated Size</Label>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                                                {formatSize(compressedSize)}
                                            </div>
                                            <div className="text-xs text-white/40 tabular-nums">
                                                <span className="line-through mr-1">{formatSize(originalSize)}</span>
                                                <span className="text-green-400">(-{Math.round((1 - compressedSize/originalSize) * 100)}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-4 block text-xs font-bold uppercase tracking-widest text-white/40">Format</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['image/jpeg', 'image/png', 'image/webp'].map(fmt => (
                                            <button
                                                key={fmt}
                                                onClick={() => setCompressSettings(s => ({...s, format: fmt}))}
                                                className={cn(
                                                    "px-3 py-3 rounded-xl border text-sm font-medium transition-all",
                                                    compressSettings.format === fmt 
                                                        ? "bg-white text-black border-white shadow-lg" 
                                                        : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                {fmt.split('/')[1].toUpperCase().replace('JPEG', 'JPG')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="flex justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Quality</span>
                                        <span className="text-xs text-white/60 font-mono">{Math.round(compressSettings.quality * 100)}%</span>
                                    </Label>
                                    <Slider 
                                        value={[compressSettings.quality]} 
                                        min={0.1} max={1} step={0.05} 
                                        onValueChange={([v]) => setCompressSettings(s => ({...s, quality: v}))}
                                        className="py-4"
                                    />
                                </div>

                                <Button 
                                    onClick={handleDownloadCompressed}
                                    className="w-full rounded-2xl py-6 text-base mt-6 bg-white text-black hover:bg-white/90 font-semibold shadow-lg shadow-white/10"
                                    disabled={isCompressing}
                                >
                                    {isCompressing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                                    Download File
                                </Button>
                            </div>
                        )}

                        {mode === 'draw' && (
                            <div className="space-y-8">
                                <div>
                                    <Label className="mb-4 block text-xs font-bold uppercase tracking-widest text-white/40">Color</Label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ffffff', '#000000', '#d946ef', '#06b6d4'].map(c => (
                                            <button 
                                                key={c}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shadow-lg",
                                                    drawColor === c ? "border-white scale-110 ring-2 ring-white/20" : "border-transparent ring-1 ring-white/10"
                                                )}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setDrawColor(c)}
                                            />
                                        ))}
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-colors ring-1 ring-white/10">
                                            <input 
                                                type="color" 
                                                value={drawColor} 
                                                onChange={(e) => setDrawColor(e.target.value)} 
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="flex justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Brush Size</span>
                                        <span className="text-xs text-white/60 font-mono">{drawSize}px</span>
                                    </Label>
                                    <Slider 
                                        value={[drawSize]} 
                                        min={1} 
                                        max={50} 
                                        step={1} 
                                        onValueChange={(v) => setDrawSize(v[0])} 
                                        className="py-4"
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'repair' && (
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-200 text-xs leading-relaxed border border-blue-500/20 backdrop-blur-sm">
                                    Tap on blemishes or red eyes to fix them instantly.
                                </div>
                                
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                     <Button 
                                        variant="ghost"
                                        className={cn("flex-1 rounded-lg", repairType === 'blemish' ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white/80 hover:bg-white/10")}
                                        onClick={() => setRepairType('blemish')}
                                     >
                                        Blemish
                                     </Button>
                                     <Button 
                                        variant="ghost"
                                        className={cn("flex-1 rounded-lg", repairType === 'redeye' ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white/80 hover:bg-white/10")} 
                                        onClick={() => setRepairType('redeye')}
                                     >
                                        Red Eye
                                     </Button>
                                </div>

                                <div className="space-y-4">
                                    <Label className="flex justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Brush Size</span>
                                        <span className="text-xs text-white/60 font-mono">{drawSize}px</span>
                                    </Label>
                                    <Slider 
                                        value={[drawSize]} 
                                        min={5} 
                                        max={50} 
                                        step={1} 
                                        onValueChange={(v) => setDrawSize(v[0])} 
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'remove-bg' && (
                            <div className="flex flex-col h-full justify-center items-center text-center space-y-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-blue-500 blur-2xl opacity-30 rounded-full" />
                                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white relative backdrop-blur-xl">
                                        <Wand2 className="w-10 h-10" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-white text-lg mb-2">Magic Removal</h4>
                                    <p className="text-sm text-white/50 max-w-[200px] mx-auto leading-relaxed">
                                        AI-powered background removal. Precise, fast, and runs locally on your device.
                                    </p>
                                </div>
                                
                                <Button 
                                    size="lg" 
                                    className="w-full rounded-2xl bg-white text-black hover:bg-white/90 font-semibold h-14 shadow-lg shadow-white/10"
                                    onClick={handleRemoveBg}
                                    disabled={isRemovingBg}
                                >
                                    {isRemovingBg ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                                        </>
                                    ) : (
                                        <>
                                            Remove Background
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-black/90 border-white/10 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Save Image</DialogTitle>
            <DialogDescription className="text-white/60">
              Choose your preferred format and quality settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Format</Label>
              <Select value={saveFormat} onValueChange={(v: any) => setSaveFormat(v)}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
                  <SelectItem value="png">PNG (Lossless)</SelectItem>
                  <SelectItem value="jpeg">JPEG (Compressed)</SelectItem>
                  <SelectItem value="webp">WebP (Modern)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(saveFormat === 'jpeg' || saveFormat === 'webp') && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-white/40">Quality</Label>
                  <span className="text-xs font-mono text-white/60">{Math.round(saveQuality * 100)}%</span>
                </div>
                <Slider
                  value={[saveQuality * 100]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(v) => setSaveQuality(v[0] / 100)}
                  className="[&_.bg-primary]:bg-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={performDownload} className="bg-white text-black hover:bg-white/90">
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub Components ---

function ToolButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <div className="group relative flex items-center">
            <button 
                onClick={onClick}
                className={cn(
                    "w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 border",
                    active 
                        ? "bg-white text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                        : "bg-transparent border-transparent text-white/60 hover:bg-white/10 hover:text-white hover:border-white/10"
                )}
            >
                <Icon className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <div className="absolute left-16 px-3 py-1.5 bg-black/80 backdrop-blur-md text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0 border border-white/10">
                {label}
            </div>
        </div>
    )
}

function AspectRatioBtn({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center py-4 px-2 rounded-2xl border transition-all gap-2 backdrop-blur-sm",
                active 
                    ? "border-white/40 bg-white/10 text-white shadow-inner" 
                    : "border-transparent bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
            )}
        >
            <Icon className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] uppercase font-bold tracking-widest">{label}</span>
        </button>
    )
}

function FilterSlider({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        value={value}
                        min={min}
                        max={max}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="w-14 h-7 text-right text-xs p-1 bg-white/5 border-white/10 rounded-lg text-white focus:ring-1 focus:ring-white/20 focus:border-white/20"
                    />
                </div>
            </div>
            <Slider 
                value={[value]} 
                min={min} 
                max={max} 
                step={1} 
                onValueChange={(v) => onChange(v[0])} 
                className="[&_.bg-primary]:bg-white [&_.bg-primary]:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            />
        </div>
    )
}

function FilterPreview({ filter, imageSrc, onClick }: { filter: Filter, imageSrc: string, onClick: () => void }) {
    // Calculate style for preview
    const filterStyle = {
        filter: `
            brightness(${filter.filter.brightness || 100}%) 
            contrast(${filter.filter.contrast || 100}%) 
            saturate(${filter.filter.saturate || 100}%) 
            sepia(${filter.filter.sepia || 0}%) 
            grayscale(${filter.filter.grayscale || 0}%) 
            blur(${filter.filter.blur || 0}px) 
            hue-rotate(${filter.filter.hueRotate || 0}deg)
        `
    };

    return (
        <button 
            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 transition-all hover:border-white/50 hover:shadow-lg hover:scale-[1.02] bg-black/20"
            onClick={onClick}
        >
            <img 
                src={imageSrc} 
                alt={filter.name} 
                className="w-full h-full object-cover transition-all duration-500"
                style={filterStyle}
            />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <span className="text-xs font-medium text-white drop-shadow-md">{filter.name}</span>
            </div>
        </button>
    )
}
