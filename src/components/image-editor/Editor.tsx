import React, { useState, useRef, useEffect } from 'react';
import { 
  Crop, Sliders, Wand2, PenTool, Eraser, Download, 
  Undo, Redo, RotateCcw, Image as ImageIcon, X, Save,
  Move, Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '../ui/dropdown-menu';

import { Canvas } from './Canvas';
import { CropPanel } from './panels/CropPanel';
import { AdjustPanel } from './panels/AdjustPanel';
import { FilterPanel } from './panels/FilterPanel';
import { MarkupPanel } from './panels/MarkupPanel';
import { RetouchPanel } from './panels/RetouchPanel';

export type EditorMode = 'crop' | 'adjust' | 'filter' | 'markup' | 'retouch' | 'erase';

interface EditorProps {
  imageSrc: string;
  onReset: () => void;
}

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  blur: number;
  hue: number;
  sepia: number;
}

export const defaultAdjustments: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  blur: 0,
  hue: 0,
  sepia: 0,
};

export function Editor({ imageSrc, onReset }: EditorProps) {
  const [activeTab, setActiveTab] = useState<EditorMode>('crop');
  const [history, setHistory] = useState<string[]>([imageSrc]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Current "Base" image (after crops/permanent changes)
  // When we crop, we update this.
  const currentImageSrc = history[historyIndex];

  // Live Adjustments (applied via CSS/Canvas filter during preview)
  const [adjustments, setAdjustments] = useState<Adjustments>(defaultAdjustments);

  // Markup state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawingWidth, setDrawingWidth] = useState(5);
  const [lines, setLines] = useState<any[]>([]); // Store drawing paths

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addToHistory = (newImageSrc: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageSrc);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  // When switching modes, sometimes we need to "commit" the current view to the history
  // e.g., applying filters permanently before drawing. 
  // For now, we'll try to keep filters live until download, OR commit them when entering "Crop" or "Markup" to avoid complexity.
  // Let's commit filters when switching TO Crop or Markup to ensure coordinates match.
  
  const commitChanges = async () => {
    if (!canvasRef.current) return;
    // Get data URL from canvas (which has filters applied)
    const dataUrl = canvasRef.current.toDataURL('image/png');
    addToHistory(dataUrl);
    // Reset live adjustments since they are now baked in
    setAdjustments(defaultAdjustments);
    setLines([]); // Bake lines too? Yes for simplicity.
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onReset}>
            <X className="w-5 h-5" />
          </Button>
          <span className="font-medium">Editor</span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex === 0}>
                  <Undo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex === history.length - 1}>
                  <Redo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-6 mx-2 bg-neutral-700" />
          <Button onClick={handleDownload} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tools */}
        <aside className="w-16 flex flex-col items-center py-4 border-r border-neutral-800 bg-neutral-900 z-10">
          <ToolButton 
            active={activeTab === 'crop'} 
            onClick={() => setActiveTab('crop')} 
            icon={<Crop className="w-5 h-5" />} 
            label="Crop" 
          />
          <ToolButton 
            active={activeTab === 'adjust'} 
            onClick={() => setActiveTab('adjust')} 
            icon={<Sliders className="w-5 h-5" />} 
            label="Adjust" 
          />
          <ToolButton 
            active={activeTab === 'filter'} 
            onClick={() => setActiveTab('filter')} 
            icon={<Wand2 className="w-5 h-5" />} 
            label="Filters" 
          />
          <ToolButton 
            active={activeTab === 'markup'} 
            onClick={() => setActiveTab('markup')} 
            icon={<PenTool className="w-5 h-5" />} 
            label="Markup" 
          />
          <ToolButton 
            active={activeTab === 'retouch'} 
            onClick={() => setActiveTab('retouch')} 
            icon={<Eraser className="w-5 h-5" />} 
            label="Retouch" 
          />
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-neutral-950 overflow-hidden flex items-center justify-center p-8">
          <Canvas 
            ref={canvasRef}
            imageSrc={currentImageSrc}
            adjustments={adjustments}
            mode={activeTab}
            onCommit={addToHistory}
            lines={lines}
            setLines={setLines}
            drawingColor={drawingColor}
            drawingWidth={drawingWidth}
          />
        </main>

        {/* Right Panel: Tool Options */}
        <aside className="w-80 border-l border-neutral-800 bg-neutral-900 flex flex-col shrink-0">
          <div className="h-14 border-b border-neutral-800 flex items-center px-4 font-medium">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Options
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4">
              {activeTab === 'crop' && (
                <CropPanel 
                  imageSrc={currentImageSrc} 
                  onApply={addToHistory} 
                />
              )}
              {activeTab === 'adjust' && (
                <AdjustPanel 
                  adjustments={adjustments} 
                  setAdjustments={setAdjustments} 
                />
              )}
              {activeTab === 'filter' && (
                <FilterPanel 
                  adjustments={adjustments} 
                  setAdjustments={setAdjustments} 
                />
              )}
              {activeTab === 'markup' && (
                <MarkupPanel 
                  color={drawingColor} 
                  setColor={setDrawingColor}
                  width={drawingWidth}
                  setWidth={setDrawingWidth}
                  onClear={() => setLines([])}
                  onApply={commitChanges}
                />
              )}
              {activeTab === 'retouch' && (
                <RetouchPanel 
                  onCommit={commitChanges}
                />
              )}
            </div>
          </ScrollArea>
          
          {/* Bottom Action for Adjust/Filter which are live */}
          {(activeTab === 'adjust' || activeTab === 'filter') && (
            <div className="p-4 border-t border-neutral-800">
              <Button className="w-full" onClick={commitChanges}>
                Apply Changes
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors
              ${active ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}
            `}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
