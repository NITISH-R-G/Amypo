import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { SlidersHorizontal, Image as ImageIcon, BoxSelect, ZoomIn, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/utils';

export default function DiffViewer({ expectedUrl, actualUrl, diffUrl, mismatchPercentage, boxes = [] }) {
  const [activeTab, setActiveTab] = useState('diff');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [imgErrors, setImgErrors] = useState({ expected: false, actual: false, diff: false });

  useEffect(() => {
    setImgErrors(prev => ({
      expected: expectedUrl ? false : prev.expected,
      actual: actualUrl ? false : prev.actual,
      diff: diffUrl ? false : prev.diff
    }));
  }, [expectedUrl, actualUrl, diffUrl]);

  const handleSliderChange = (e) => {
    setSliderPosition(e.target.value);
  };

  const tabs = [
    { id: 'diff', label: 'Deviations', icon: <BoxSelect size={16} /> },
    { id: 'slider', label: 'Slider', icon: <SlidersHorizontal size={16} /> },
    { id: 'expected', label: 'Baseline', icon: <ImageIcon size={16} /> },
    { id: 'actual', label: 'Result', icon: <ImageIcon size={16} /> },
  ];

  const renderImageOrPlaceholder = (kind, src, alt, className) => {
    const hasSrc = typeof src === 'string' && src.length > 0;
    const failed = imgErrors[kind];

    if (!hasSrc || failed) {
      return (
        <div className="flex flex-col items-center justify-center text-slate-500 text-xs bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl px-6 py-20 w-full font-black uppercase tracking-widest">
          <AlertCircle size={32} className="mb-4 opacity-20" />
          {failed ? 'Engine Capture Failed' : 'Scanning...'}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={cn("transition-all duration-700", className)}
        loading="lazy"
        onError={() => setImgErrors(prev => ({ ...prev, [kind]: true }))}
      />
    );
  };
 
  return (
    <div className="w-full glass-panel rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col bg-white">
      
      {/* HUD Header */}
      <div className="px-8 py-5 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
            <BoxSelect size={20} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Visual Deviation Engine</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub-pixel parity analysis active</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest border shadow-sm transition-all",
            mismatchPercentage <= 1 ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
            mismatchPercentage <= 5 ? "bg-amber-50 border-amber-100 text-amber-600" :
            "bg-red-50 border-red-100 text-red-600 shadow-red-200/20"
          )}>
            {Number(mismatchPercentage || 0).toFixed(2)}% Mismatch Detected
          </div>
          
          {boxes.length > 0 && activeTab === 'diff' && (
            <button 
              onClick={() => setShowBoxes(!showBoxes)}
              className={cn(
                 "text-[10px] font-black px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all uppercase tracking-widest",
                 showBoxes 
                   ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                   : "bg-white border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm"
              )}
            >
              <Info size={14} /> {showBoxes ? 'Active Bounds' : 'Show Bounds'}
            </button>
          )}
        </div>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <Tabs.List className="flex bg-white border-b border-gray-100 px-6 pt-0 gap-8 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap relative",
                activeTab === tab.id 
                  ? "text-indigo-600 border-indigo-600" 
                  : "text-gray-400 border-transparent hover:text-gray-600"
              )}
            >
              <div className="flex items-center gap-2">
                {tab.icon} {tab.label}
              </div>
              {activeTab === tab.id && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="bg-[#f8fafc] p-8 flex justify-center items-center min-h-[450px] relative overflow-hidden">
           <div className="hud-scanline opacity-5" />
           
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.02 }}
               transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
               className="w-full flex justify-center relative"
             >
               {activeTab === 'expected' && (
                 renderImageOrPlaceholder('expected', expectedUrl, 'Expected', "max-w-full rounded-2xl shadow-2xl ring-1 ring-gray-200")
               )}
                
               {activeTab === 'actual' && (
                 renderImageOrPlaceholder('actual', actualUrl, 'Actual', "max-w-full rounded-2xl shadow-2xl ring-1 ring-gray-200")
               )}

               {activeTab === 'diff' && (
                  <div className="relative inline-block group">
                    {renderImageOrPlaceholder('diff', diffUrl, 'Diff', "max-w-full rounded-2xl shadow-2xl ring-4 ring-red-500/10")}
                    
                    {showBoxes && diffUrl && !imgErrors.diff && boxes.map((box, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "absolute border-2 border-indigo-500 rounded shadow-[0_0_20px_rgba(99,102,241,0.4)] z-10 transition-all cursor-crosshair overflow-hidden",
                          selectedBox === idx ? "bg-indigo-500/30 scale-105 z-20" : "bg-indigo-500/10 hover:bg-indigo-500/20"
                        )}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`
                        }}
                        onClick={() => setSelectedBox(selectedBox === idx ? null : idx)}
                      >
                         <div className="absolute top-0 left-0 w-full h-full animate-pulse-slow bg-indigo-400/10" />
                         <div className="absolute top-1 right-1">
                           <ZoomIn size={12} className="text-white opacity-60" />
                         </div>
                         
                         {selectedBox === idx && (
                           <motion.div 
                             initial={{ y: 10, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-30"
                           >
                             Critical Deviation Detected
                           </motion.div>
                         )}
                      </motion.div>
                    ))}
                  </div>
                )}

               {activeTab === 'slider' && (
                  <div className="relative inline-block max-w-full overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-gray-200 select-none group">
                    {renderImageOrPlaceholder('actual', actualUrl, 'Actual', "max-w-full block")}
                     <div 
                       className="absolute top-0 bottom-0 left-0 overflow-hidden" 
                       style={{ width: `${sliderPosition}%` }}
                     >
                      {renderImageOrPlaceholder('expected', expectedUrl, 'Expected', "max-w-none block w-full h-full")}
                     </div>
                     
                     <div 
                       className="absolute top-0 bottom-0 w-[4px] bg-white cursor-ew-resize shadow-[0_0_30px_rgba(255,255,255,0.8)] z-20 transition-colors"
                       style={{ left: `calc(${sliderPosition}% - 2px)` }}
                     >
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100">
                         <SlidersHorizontal size={14} className="text-indigo-600" />
                       </div>
                     </div>
                     
                     <input 
                       type="range" 
                       min="0" 
                       max="100" 
                       value={sliderPosition} 
                       onChange={handleSliderChange}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                     />
                  </div>
                )}
             </motion.div>
           </AnimatePresence>
        </div>
      </Tabs.Root>
    </div>
  );
}
