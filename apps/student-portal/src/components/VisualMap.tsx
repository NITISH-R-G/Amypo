import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge tailwind classes gracefully
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface VisualMapProps {
  expectedUrl: string;
  actualUrl: string;
  diffUrl: string;
}

type TabType = 'expected' | 'actual' | 'diff';
type ViewportType = 'desktop' | 'mobile';

const VIEWPORTS = {
  desktop: 'w-full max-w-[1024px]',
  mobile: 'w-full max-w-[375px]'
};

export const VisualMap: React.FC<VisualMapProps> = ({ expectedUrl, actualUrl, diffUrl }) => {
  const [activeTab, setActiveTab] = useState<TabType>('diff');
  const [viewport, setViewport] = useState<ViewportType>('desktop');

  const currentSrc = {
    expected: expectedUrl,
    actual: actualUrl,
    diff: diffUrl
  }[activeTab];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-grayscale-200 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-black mb-1">Visual Regression Map</h2>
          <p className="text-sm text-grayscale-500">Pixel-perfect rendering differential analysis.</p>
        </div>

        {/* Controls block */}
        <div className="flex items-center gap-4">
          
          {/* Viewport Toggle */}
          <div className="flex bg-grayscale-100 p-1 rounded-md">
            <button
              onClick={() => setViewport('desktop')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded transition-colors",
                viewport === 'desktop' ? "bg-white text-black shadow-sm" : "text-grayscale-500 hover:text-black"
              )}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded transition-colors",
                viewport === 'mobile' ? "bg-white text-black shadow-sm" : "text-grayscale-500 hover:text-black"
              )}
            >
              Mobile
            </button>
          </div>

        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="border-b border-grayscale-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          {(['expected', 'actual', 'diff'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap pb-3 border-b-2 font-medium text-sm transition-colors capitalize",
                activeTab === tab 
                  ? "border-primary text-primary" 
                  : "border-transparent text-grayscale-500 hover:text-black hover:border-grayscale-300"
              )}
            >
              {tab === 'diff' ? 'Diff Heatmap' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Frame Container */}
      <div className="bg-grayscale-100 border border-grayscale-200 rounded overflow-hidden min-h-[600px] flex justify-center p-4">
        {/* The Viewport Container */}
        <div className={cn("transition-all duration-300 shadow-lg relative bg-white", VIEWPORTS[viewport])}>
          <img 
            src={currentSrc} 
            alt={`Visual map - ${activeTab}`} 
            className="w-full h-auto object-contain block"
          />
        </div>
      </div>
    </div>
  );
};
