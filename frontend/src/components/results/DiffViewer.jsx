import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { SlidersHorizontal, Image as ImageIcon, BoxSelect } from 'lucide-react';
import { cn } from '../../utils/utils';

export default function DiffViewer({ expectedUrl, actualUrl, diffUrl, mismatchPercentage, boxes = [] }) {
  const [activeTab, setActiveTab] = useState('diff');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showBoxes, setShowBoxes] = useState(true);
  const [imgErrors, setImgErrors] = useState({ expected: false, actual: false, diff: false });

  // If URLs update while the user is on the page (polling), clear stale error flags.
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
    { id: 'expected', label: 'Expected Baseline', icon: <ImageIcon size={16} /> },
    { id: 'actual', label: 'Your Result', icon: <ImageIcon size={16} /> },
    { id: 'diff', label: 'Diff Heatmap', icon: <BoxSelect size={16} /> },
    { id: 'slider', label: 'Slider Compare', icon: <SlidersHorizontal size={16} /> }
  ];

  const renderImageOrPlaceholder = (kind, src, alt, className) => {
    const hasSrc = typeof src === 'string' && src.length > 0;
    const failed = imgErrors[kind];

    if (!hasSrc || failed) {
      return (
        <div className="flex items-center justify-center text-slate-300 text-sm bg-slate-950/30 border border-slate-800 rounded-lg px-6 py-10">
          {failed ? 'Visual comparison could not be generated.' : 'Evaluation artifacts not generated yet.'}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setImgErrors(prev => ({ ...prev, [kind]: true }))}
      />
    );
  };
 
  return (
    <div className="w-full bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden flex flex-col">
      
      {/* Header and Controls */}
      <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap gap-4 justify-between items-center bg-slate-900">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-200">Visual Deviation Engine</h3>
          <span className={cn(
            "px-2.5 py-1 text-xs font-bold rounded-md",
            mismatchPercentage <= 1 ? "bg-emerald-500/20 text-emerald-400" :
            mismatchPercentage <= 5 ? "bg-amber-500/20 text-amber-400" :
            "bg-red-500/20 text-red-400"
          )}>
            {Number(mismatchPercentage || 0).toFixed(2)}% Mismatch
          </span>
        </div>
        
        {boxes.length > 0 && activeTab === 'diff' && (
          <button 
            onClick={() => setShowBoxes(!showBoxes)}
            className={cn(
               "text-sm font-medium px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all",
               showBoxes 
                 ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" 
                 : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300"
            )}
          >
            <BoxSelect size={16} /> {showBoxes ? 'Hide Bounding Boxes' : 'Show Error Bounds'}
          </button>
        )}
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <Tabs.List className="flex bg-slate-900 border-b border-slate-800 px-2 pt-2 gap-1 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-all border border-transparent border-b-0 flex items-center gap-2 whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-slate-800 text-white border-slate-700" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              {tab.icon} {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="bg-[#0f172a] p-6 flex justify-center items-center min-h-[400px] relative overflow-auto">
           
           {/* Tab Contents */}
           {activeTab === 'expected' && (
             renderImageOrPlaceholder('expected', expectedUrl, 'Expected', "max-w-full rounded shadow-xl border border-slate-700")
            )}
            
           {activeTab === 'actual' && (
             renderImageOrPlaceholder('actual', actualUrl, 'Actual', "max-w-full rounded shadow-xl border border-slate-700")
            )}

           {activeTab === 'diff' && (
              <div className="relative inline-block">
               {renderImageOrPlaceholder('diff', diffUrl, 'Diff', "max-w-full rounded shadow-xl border border-red-500/30")}
                
                {/* Overlay Bounding Boxes */}
                {showBoxes && diffUrl && !imgErrors.diff && boxes.map((box, idx) => (
                  <div 
                    key={idx}
                    className="absolute border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10 transition-all hover:bg-indigo-500/30 group cursor-help"
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`
                    }}
                  >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-900 text-indigo-100 text-xs px-2 py-1 rounded border border-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                       High mismatch area
                     </div>
                  </div>
                ))}
              </div>
            )}

           {activeTab === 'slider' && (
              <div className="relative inline-block max-w-full overflow-hidden rounded shadow-xl border border-slate-700 select-none group">
                {renderImageOrPlaceholder('actual', actualUrl, 'Actual', "max-w-full block")}
                 <div 
                   className="absolute top-0 bottom-0 left-0 overflow-hidden" 
                   style={{ width: `${sliderPosition}%` }}
                 >
                  {renderImageOrPlaceholder('expected', expectedUrl, 'Expected', "max-w-none block")}
                 </div>
                 {/* Visual Divider Line */}
                 <div 
                   className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 group-hover:bg-indigo-400 transition-colors"
                   style={{ left: `calc(${sliderPosition}% - 2px)` }}
                 />
                 
                 {/* Native Range Slider overlapping completely invisibly */}
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

        </div>
      </Tabs.Root>
    </div>
  );
}
