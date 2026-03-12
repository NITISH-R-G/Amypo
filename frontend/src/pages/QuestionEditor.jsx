import { useState, useEffect } from 'react';
import { Save, Code2, ShieldAlert, Cpu, Layout, Plus, Trash2, X, Check, SaveAll } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { id: 'general', label: 'General', icon: Layout },
  { icon: Code2, id: 'code', label: 'Starter Code' },
  { icon: ShieldAlert, id: 'constraints', label: 'Constraints' },
  { icon: Cpu, id: 'tests', label: 'Test Specs' }
];

export default function QuestionEditor({ id }) {
  const [activeTab, setActiveTab] = useState('general');
  const [question, setQuestion] = useState({
    title: '',
    description: '',
    starter_code: { html: '', css: '', js: '' },
    constraints: [],
    test_specs: []
  });

  const addConstraint = () => {
    setQuestion(prev => ({
      ...prev,
      constraints: [...prev.constraints, { type: 'css', property: '', value: '', selector: '' }]
    }));
  };

  const removeConstraint = (idx) => {
    setQuestion(prev => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Question Editor</h1>
          <p className="text-gray-500 font-medium">Design professional-grade frontend challenges</p>
        </div>
        <div className="flex gap-3">
           <button className="px-5 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
             Cancel
           </button>
           <button className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2">
             <SaveAll size={18} /> Save Challenge
           </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Tab Sidebar */}
        <aside className="w-64 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-8 min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Challenge Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Build a Product Grid with Grid Layout"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-50 focus:border-indigo-100 outline-none transition-all placeholder:text-gray-300 font-medium text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Detailed Briefing</label>
                  <textarea 
                    rows={8}
                    placeholder="Describe the objective, expected behavior, and specific requirements..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-50 focus:border-indigo-100 outline-none transition-all placeholder:text-gray-300 font-medium leading-relaxed"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'constraints' && (
              <motion.div 
                key="constraints"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Architectural Constraints</h3>
                  <button onClick={addConstraint} className="text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                    <Plus size={18} /> Add Condition
                  </button>
                </div>
                
                <div className="space-y-4">
                   {question.constraints.map((c, idx) => (
                     <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4">
                       <select className="bg-transparent font-bold text-sm outline-none">
                         <option>CSS Property</option>
                         <option>HTML Tag</option>
                         <option>JS Function</option>
                       </select>
                       <input type="text" placeholder="Selector (.card)" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
                       <input type="text" placeholder="Value (flex)" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
                       <button onClick={() => removeConstraint(idx)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                         <Trash2 size={18} />
                       </button>
                     </div>
                   ))}
                   {question.constraints.length === 0 && (
                     <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl text-gray-400 font-medium">
                       No constraints defined. Students have total creative freedom.
                     </div>
                   )}
                </div>
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div 
                key="code"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">HTML Starter</label>
                      <div className="h-48 rounded-2xl bg-gray-900 text-emerald-400 p-4 font-mono text-sm shadow-inner overflow-hidden">
                        &lt;div class="container"&gt;&lt;/div&gt;
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">CSS Starter</label>
                      <div className="h-48 rounded-2xl bg-gray-900 text-sky-400 p-4 font-mono text-sm shadow-inner overflow-hidden">
                        .container &#11311; &#11312;
                      </div>
                   </div>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium">
                  Starter code helps students get up to speed quickly by providing the initial structural boilerplate.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
