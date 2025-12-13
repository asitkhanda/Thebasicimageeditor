import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import ImageEditor from './components/editor/ImageEditor';
import { cn } from './lib/utils';

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageSrc(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  if (imageSrc) {
    return <ImageEditor initialImage={imageSrc} onClose={() => setImageSrc(null)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center selection:bg-pink-500/30">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div 
        className={cn(
          "relative w-full max-w-2xl p-16 rounded-[3rem] flex flex-col items-center justify-center text-center transition-all duration-500 ease-out border backdrop-blur-2xl shadow-2xl",
          isDragging 
            ? "border-white/50 bg-white/20 scale-[1.02]" 
            : "border-white/10 bg-black/30 hover:bg-black/40 hover:border-white/20"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[3rem] pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="w-28 h-28 bg-white/5 rounded-[2rem] flex items-center justify-center mb-10 ring-1 ring-white/10 shadow-xl backdrop-blur-md group">
              <Upload className="w-12 h-12 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
                    Essential Editor
                </span>
            </h1>
            
            <p className="text-lg text-white/60 mb-12 max-w-md leading-relaxed font-light">
              Completely free! <br/>
              <span className="text-white/40 text-sm">Crop, Filter, Adjust and Remove Backgrounds.</span>
            </p>
            
            <label className="relative cursor-pointer group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-white text-black hover:bg-white/90 font-semibold py-5 px-12 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 flex items-center gap-2 text-lg rounded-[40px]">
                <ImageIcon className="w-5 h-5" />
                Select your first image
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/jpeg, image/png, image/webp, image/gif, image/bmp, image/tiff"
                onChange={handleFileInput}
              />
            </label>
            
            <div className="mt-16 flex items-center gap-3 text-xs font-medium text-white/30 uppercase tracking-widest px-6 py-3 rounded-full border border-white/5 bg-white/5 backdrop-blur-md bg-[rgba(255,255,255,0.14)]">
              <ImageIcon className="w-4 h-4 opacity-50" />
              <span>Supports Most Image Formats</span>
            </div>

            <div className="mt-8 text-white/20 text-xs font-light text-[rgba(188,181,181,0.86)]">
              Created with &lt;3 by <a href="https://asit.design" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors border-b border-white/10 hover:border-white/40 pb-0.5">Asit</a>
            </div>
        </div>
      </div>
    </div>
  );
}
