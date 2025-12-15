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
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[url('https://images.unsplash.com/photo-1677586895666-fd27db4205da?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center selection:bg-pink-500/30">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div 
        className={cn(
          "relative w-full max-w-5xl rounded-3xl md:rounded-[3rem] flex flex-col md:flex-row overflow-hidden transition-all duration-500 ease-out border backdrop-blur-2xl shadow-2xl",
          isDragging 
            ? "border-white/50 bg-white/20 scale-[1.02]" 
            : "border-white/10 bg-black/40 hover:bg-black/50 hover:border-white/20"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Decorative Background inside card */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
             <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/20 blur-[120px] rounded-full" />
             <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/20 blur-[120px] rounded-full" />
        </div>

        {/* Left Column: Content */}
        <div className="flex-1 p-8 md:p-16 flex flex-col items-start justify-center text-left relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-medium mb-8 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Essential Editor</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight drop-shadow-lg">
                Edit images <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400">
                    in seconds.
                </span>
            </h1>
            
            <p className="text-lg text-white/60 mb-10 max-w-md leading-relaxed font-light">
              The simplest tools in your browser. <br className="hidden md:block" />
              Crop, compress, adjust, and remove background without uploading your data.
            </p>
            
            {/* The Main Action */}
            <label className="relative cursor-pointer group w-full md:w-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white text-black hover:bg-gray-50 font-semibold py-4 px-8 md:py-5 md:px-10 transition-all shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 text-lg rounded-full">
                <ImageIcon className="w-5 h-5" />
                <span>Upload your first image</span>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/jpeg, image/png, image/webp, image/gif, image/bmp, image/tiff"
                onChange={handleFileInput}
              />
            </label>

            {/* Footer / Trust */}
            <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-white/30 font-medium">
                <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                    Browser-based
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                    Private
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                    Free forever
                </span>
            </div>

            {/* Peerlist Badge */}
            <div className="mt-8">
                <a href="https://peerlist.io/asitkhanda/project/essential-editor" target="_blank" rel="noreferrer" className="block hover:opacity-90 transition-opacity">
                    <img
                        src="https://peerlist.io/api/v1/projects/embed/PRJH6A7BNEA7BOB9O1RMRKD67NDLGM?showUpvote=true&theme=dark"
                        alt="Essential Editor"
                        className="h-[50px] md:h-[72px] w-auto rounded-lg"
                    />
                </a>
            </div>
        </div>

        {/* Right Column: Visuals / Features (Desktop Only) */}
        <div className="grid flex-1 relative bg-white/5 md:border-l border-t md:border-t-0 border-white/5 grid-cols-3 md:grid-cols-2 gap-3 md:gap-5 p-4 md:p-10 overflow-hidden place-content-center">
             {[
                 "https://images.unsplash.com/photo-1596309405988-b16d9e2852c7?q=80&w=600&auto=format&fit=crop",
                 "https://images.unsplash.com/photo-1719224469475-5c67bde4c549?q=80&w=600&auto=format&fit=crop",
                 "https://images.unsplash.com/photo-1701276077677-004ac175f875?q=80&w=600&auto=format&fit=crop",
                 "https://images.unsplash.com/photo-1598285656754-535e61d246ec?q=80&w=600&auto=format&fit=crop",
                 "https://images.unsplash.com/photo-1717665554058-7a83e4d238ff?q=80&w=600&auto=format&fit=crop",
                 "https://images.unsplash.com/photo-1713888723181-7a0c4de332a3?q=80&w=600&auto=format&fit=crop"
             ].map((url, i) => (
                 <div key={i} className={cn(
                     "group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-lg transition-all duration-500 hover:z-20 hover:scale-[1.15] hover:shadow-2xl bg-gray-900 aspect-square",
                     i % 2 === 0 ? "rotate-[-3deg] hover:rotate-0 translate-y-2 md:translate-y-4" : "rotate-[3deg] hover:rotate-0 -translate-y-2 md:-translate-y-4",
                     "hover:border-white/30"
                 )}>
                    <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" alt={`Sample ${i}`} />
                    
                    {/* Hover Overlay with Upload */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 md:gap-3 backdrop-blur-[2px]">
                        <label className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors cursor-pointer group/btn">
                            <Upload className="w-4 h-4 md:w-5 md:h-5 text-white group-hover/btn:scale-110 transition-transform" />
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const img = e.target.closest('.group')?.querySelector('img');
                                        if (img) img.src = URL.createObjectURL(file);
                                    }
                                }}
                            />
                        </label>
                        <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/70 font-medium">Replace</span>
                    </div>
                 </div>
             ))}
        </div>
      </div>
    </div>
  );
}
