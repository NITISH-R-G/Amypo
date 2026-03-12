import React, { useState } from 'react';
import { Plus, UploadCloud, Play, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const AuthoringInterface: React.FC = () => {
  const [actions, setActions] = useState<{ type: string; selector: string; value?: string }[]>([]);

  const addAction = (type: string) => {
    setActions([...actions, { type, selector: '' }]);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-grayscale-200 w-full mb-8">
      <div className="flex items-center justify-between mb-6 border-b border-grayscale-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-black mb-1">Author Assignment Spec</h2>
          <p className="text-sm text-grayscale-500">Construct deterministic evaluation JSON blueprints visually.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-grayscale-100 text-black rounded font-medium text-sm hover:bg-grayscale-200 transition-colors">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded font-medium text-sm hover:bg-green-600 transition-colors shadow-sm">
            <Play className="w-4 h-4" /> Generate Baseline Capture
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Sandbox Starter Kit */}
        <div>
          <h3 className="text-md font-bold text-black mb-3">Starter Code Bundle</h3>
          <div className="border-2 border-dashed border-grayscale-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-grayscale-50 hover:bg-grayscale-100 transition-colors cursor-pointer">
            <UploadCloud className="w-10 h-10 text-grayscale-400 mb-3" />
            <p className="text-sm font-medium text-black">Click to upload evaluation bundle (.zip)</p>
            <p className="text-xs text-grayscale-500 mt-1">Must contain index.html and assets</p>
          </div>
        </div>

        {/* Right Column: Spec Array Builder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-black">Interaction Sequence</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => addAction('click')}
                className="p-1 px-2 text-xs font-medium bg-grayscale-100 rounded border border-grayscale-200 flex items-center gap-1 hover:bg-grayscale-200"
              >
                <Plus className="w-3 h-3"/> Click
              </button>
              <button 
                onClick={() => addAction('type')}
                className="p-1 px-2 text-xs font-medium bg-grayscale-100 rounded border border-grayscale-200 flex items-center gap-1 hover:bg-grayscale-200"
              >
                <Plus className="w-3 h-3"/> Type
              </button>
            </div>
          </div>

          <div className="space-y-3 min-h-[150px] max-h-[300px] overflow-y-auto pr-2 bg-grayscale-50 p-4 rounded border border-grayscale-200">
            {actions.length === 0 ? (
              <p className="text-sm text-grayscale-400 text-center mt-8 italic">No interactions configured. Puppeteer will only validate initial load state.</p>
            ) : (
              actions.map((act, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded border border-grayscale-200 shadow-sm">
                  <span className="text-xs font-mono font-bold bg-grayscale-100 px-2 py-1 rounded text-grayscale-600 uppercase border border-grayscale-200">{act.type}</span>
                  <input 
                    type="text" 
                    placeholder="DOM Selector (e.g. #submit-btn)" 
                    className="flex-1 text-sm border-b border-grayscale-300 focus:outline-none focus:border-primary pb-1"
                  />
                  {act.type === 'type' && (
                    <input 
                      type="text" 
                      placeholder="Input Value" 
                      className="flex-1 text-sm border-b border-grayscale-300 focus:outline-none focus:border-primary pb-1"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
