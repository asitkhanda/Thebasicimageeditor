import React, { createContext, useContext, useState } from 'react';

interface ImageEditorContextType {
  // Crop State
  crop: { x: number; y: number };
  setCrop: (crop: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  rotation: number;
  setRotation: (rotation: number) => void;
  aspect: number | undefined; // undefined = free
  setAspect: (aspect: number | undefined) => void;
  croppedAreaPixels: any;
  setCroppedAreaPixels: (pixels: any) => void;
  
  // Retouch State
  brushSize: number;
  setBrushSize: (size: number) => void;
}

const ImageEditorContext = createContext<ImageEditorContextType | undefined>(undefined);

export function ImageEditorProvider({ children }: { children: React.ReactNode }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [brushSize, setBrushSize] = useState(20);

  return (
    <ImageEditorContext.Provider value={{
      crop, setCrop,
      zoom, setZoom,
      rotation, setRotation,
      aspect, setAspect,
      croppedAreaPixels, setCroppedAreaPixels,
      brushSize, setBrushSize,
    }}>
      {children}
    </ImageEditorContext.Provider>
  );
}

export function useImageEditor() {
  const context = useContext(ImageEditorContext);
  if (!context) throw new Error("useImageEditor must be used within ImageEditorProvider");
  return context;
}
