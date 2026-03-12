import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, AlertCircle, Maximize2, RotateCcw, Loader2, Sparkles, Server, Check } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import CodeEditor from '../components/workspace/CodeEditor';
import PreviewFrame from '../components/workspace/PreviewFrame';
import QuestionPanel from '../components/workspace/QuestionPanel';
import { cn } from '../utils/utils';
import { useToast } from '../components/ui/use-toast';

const EVALUATION_STAGES = [
  { id: 'package', label: 'Packaging submission', duration: 600 },
  { id: 'sandbox', label: 'Launching headless sandbox', duration: 800 },
  { id: 'dom', label: 'Running DOM & CSS assertions', duration: 1200 },
  { id: 'interaction', label: 'Simulating user interactions', duration: 1000 },
  { id: 'visual', label: 'Computing visual diff heatmaps', duration: 1500 },
  { id: 'ai', label: 'Generating AI feedback insights', duration: 1100 },
  { id: 'score', label: 'Finalizing score rubric', duration: 500 }
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('html');
  const [code, setCode] = useState({
    html: '<div class="card">\n  <h2>Profile</h2>\n  <button>Follow</button>\n</div>',
    css: '.card {\n  padding: 24px;\n  background: white;\n  border-radius: 12px;\n  box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n}',
    js: 'document.querySelector("button").addEventListener("click", () => {\n  alert("Followed!");\n});',
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStageIndex, setEvalStageIndex] = useState(-1);

  // Mock Question Data
  const question = {
    title: "Build a Social Profile Card",
    difficulty: "Medium",
    description: "Create a responsive social media profile card component. It should match the design specs precisely, including hover states and the follow button interaction.",
    requirements: [
      "Use Flexbox or Grid for layout",
      "Ensure the card is centered on the screen",
      "Implement the specific hover states on the button",
      "Trigger an alert on button click"
    ]
  };

  const handleRunTests = () => {
    setIsEvaluating(true);
    setEvalStageIndex(0);
  };

  useEffect(() => {
    if (evalStageIndex >= 0 && evalStageIndex < EVALUATION_STAGES.length) {
      const timer = setTimeout(() => {
        setEvalStageIndex(prev => prev + 1);
      }, EVALUATION_STAGES[evalStageIndex].duration);
      return () => clearTimeout(timer);
    } else if (evalStageIndex === EVALUATION_STAGES.length) {
      // Evaluation Complete, Redirect
      setTimeout(() => {
        toast({
          title: "Evaluation Completed",
          description: "Redirecting to your detailed results report...",
        });
        navigate('/results/demo-123');
      }, 500);
    }
  }, [evalStageIndex, navigate, toast]);

  return (
    <div className="h-full flex flex-col gap-4 relative">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Practice Workspace</h2>
          <p className="text-sm text-gray-500">Evaluation Engine v2.0</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => toast({title: "Code Reset", description: "Your code has been reset to the baseline."})} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors shadow-sm">
             <RotateCcw size={16} /> Reset Code
           </button>
           <button 
             onClick={handleRunTests}
             disabled={isEvaluating}
             className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
           >
             {isEvaluating ? (
               <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80"></div> Evaluating...</>
             ) : (
               <><Play size={16} fill="white" /> Submit & Evaluate</>
             )}
           </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-slate-900 text-slate-200 px-4 py-3 text-sm font-semibold border-b border-slate-800 flex items-center justify-between">
            <span>Description</span>
          </div>
          <div className="flex-1 overflow-auto">
             <QuestionPanel question={question} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 rounded-xl shadow-sm border border-slate-800 flex flex-col overflow-hidden shadow-indigo-900/5">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <Tabs.List className="flex bg-slate-900 border-b border-slate-800 px-2 pt-2 gap-1">
              {['html', 'css', 'js'].map((lang) => (
                <Tabs.Trigger
                  key={lang}
                  value={lang}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-all border border-transparent border-b-0",
                    activeTab === lang 
                      ? "bg-slate-800 text-indigo-400 border-slate-700 shadow-sm" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  )}
                >
                  index.{lang}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <div className="flex-1 min-h-0 bg-[#0f172a]">
              <CodeEditor 
                language={activeTab === 'js' ? 'javascript' : activeTab}
                value={code[activeTab]}
                onChange={(val) => setCode(prev => ({ ...prev, [activeTab]: val }))}
              />
            </div>
          </Tabs.Root>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
           <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-[300px]">
             <div className="bg-slate-900 text-slate-200 px-4 py-3 text-sm font-semibold border-b border-slate-800 flex items-center justify-between">
                <span>Live Preview</span>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <Maximize2 size={14} />
                </button>
             </div>
             <div className="flex-1 relative">
                <PreviewFrame html={code.html} css={code.css} js={code.js} />
             </div>
           </div>

           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
               <AlertCircle size={16} className="text-indigo-500" />
               Live Diagnostics
             </h3>
             <div className="space-y-2">
                <div className="flex items-start gap-2 bg-emerald-50 text-emerald-700 p-2.5 rounded-lg text-sm border border-emerald-100">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <p>Syntax checks passed. No static analysis errors.</p>
                </div>
                <div className="flex items-start gap-2 bg-indigo-50 text-indigo-700 p-2.5 rounded-lg text-sm border border-indigo-100">
                  <div className="mt-0.5 shrink-0 uppercase font-bold text-[10px] tracking-wider bg-indigo-200 px-1.5 py-0.5 rounded text-indigo-800">TIP</div>
                  <p>Make sure to check the button hover color contrast.</p>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* Animated Live Evaluation Progress Overlay */}
      <AnimatePresence>
        {isEvaluating && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                   {evalStageIndex >= EVALUATION_STAGES.length ? <Check size={20} className="text-emerald-500" /> : <Server size={20} className="animate-pulse" />}
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900 text-lg">Evaluation Pipeline</h3>
                   <p className="text-sm text-gray-500">Worker ID: <span className="font-mono text-xs">wk-9f8a2b1</span></p>
                 </div>
              </div>

              <div className="space-y-4">
                {EVALUATION_STAGES.map((stage, i) => {
                  const isActive = i === evalStageIndex;
                  const isPast = i < evalStageIndex;
                  return (
                    <div key={stage.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className={cn(
                          "font-medium transition-colors duration-300",
                          isActive ? "text-indigo-600" : isPast ? "text-gray-900" : "text-gray-400"
                        )}>
                          {stage.label}
                        </span>
                        {isActive && <Loader2 size={14} className="text-indigo-500 animate-spin" />}
                        {isPast && <Check size={14} className="text-emerald-500" />}
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: isPast ? "100%" : isActive ? "50%" : 0 }}
                          transition={isActive ? { duration: stage.duration / 1000, ease: "linear" } : { duration: 0.2 }}
                          className={cn(
                            "h-full rounded-full",
                            isPast ? "bg-emerald-500" : "bg-indigo-600"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {evalStageIndex >= EVALUATION_STAGES.length && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} 
                  className="mt-6 bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-100 flex items-center justify-center gap-2 font-medium text-sm text-center"
                >
                  <Sparkles size={16} /> Evaluation Complete! Redirecting...
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
