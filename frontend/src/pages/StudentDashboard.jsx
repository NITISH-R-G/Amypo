import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, CheckCircle2, AlertCircle, Maximize2, RotateCcw, Loader2, Sparkles, Server, Check, Activity, Zap, Terminal } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import CodeEditor from '../components/workspace/CodeEditor';
import PreviewFrame from '../components/workspace/PreviewFrame';
import QuestionPanel from '../components/workspace/QuestionPanel';
import { cn } from '../utils/utils';
import { useToast } from '../components/ui/use-toast';

const EVALUATION_STAGES = [
  { id: 'package', label: 'Packaging submission', duration: 400 },
  { id: 'sandbox', label: 'Launching headless sandbox', duration: 600 },
  { id: 'dom', label: 'Running DOM & CSS assertions', duration: 1000 },
  { id: 'interaction', label: 'Simulating user interactions', duration: 800 },
  { id: 'visual', label: 'Computing visual diff heatmaps', duration: 1200 },
  { id: 'ai', label: 'Generating AI feedback insights', duration: 1000 },
  { id: 'score', label: 'Finalizing score rubric', duration: 400 }
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('html');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [questionDetails, setQuestionDetails] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(true);
  const requestedQuestionId = Number(searchParams.get('questionId') || 0) || null;

  const [starterCode, setStarterCode] = useState({ html: '', css: '', js: '' });
  const [code, setCode] = useState({ html: '', css: '', js: '' });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStageIndex, setEvalStageIndex] = useState(-1);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadQuestions() {
      setQuestionsLoading(true);
      try {
        const res = await fetch('/api/questions');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load questions');
        if (cancelled) return;
        const qs = Array.isArray(data.questions) ? data.questions : [];
        setQuestions(qs);
        if (qs.length > 0) {
          const requested = requestedQuestionId && qs.some((x) => x.id === requestedQuestionId) ? requestedQuestionId : null;
          setSelectedQuestionId((prev) => (requested ? requested : (prev == null ? qs[0].id : prev)));
        }
      } catch (e) {
        toast({ title: 'Load Failed', description: e?.message || 'Could not load questions.', variant: 'destructive' });
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }
    loadQuestions();
    return () => { cancelled = true; };
  }, [requestedQuestionId, toast]);

  useEffect(() => {
    let cancelled = false;
    async function loadQuestionDetails() {
      if (!selectedQuestionId) return;
      setQuestionLoading(true);
      try {
        const res = await fetch(`/api/questions/${selectedQuestionId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load question');
        if (cancelled) return;
        setQuestionDetails(data);
        const files = Array.isArray(data.files) ? data.files : [];
        const next = {
          html: files.find((f) => f.type === 'html')?.content ?? '',
          css: files.find((f) => f.type === 'css')?.content ?? '',
          js: files.find((f) => f.type === 'js')?.content ?? ''
        };
        setStarterCode(next);
        setCode(next);
      } catch (e) {
        toast({ title: 'Load Failed', description: e?.message || 'Could not load question.', variant: 'destructive' });
      } finally {
        if (!cancelled) setQuestionLoading(false);
      }
    }
    loadQuestionDetails();
    return () => { cancelled = true; };
  }, [selectedQuestionId, toast]);

  const question = (() => {
    const q = questionDetails?.question || {};
    const spec = questionDetails?.testSpec || {};
    const domHints = Array.isArray(spec?.tests?.dom) ? spec.tests.dom.map((t) => t.hint).filter(Boolean) : [];
    const cssHints = Array.isArray(spec?.tests?.css) ? spec.tests.css.map((t) => t.hint).filter(Boolean) : [];
    const requirements = [...domHints, ...cssHints].filter(Boolean).slice(0, 6);
    return {
      title: q.title || 'Practice Workspace',
      difficulty: spec?.difficulty || 'Medium',
      description: q.description || '',
      requirements: requirements.length > 0 ? requirements : ["Complete the UI requirements", "Match layout and hover states", "Ensure click interaction works"]
    };
  })();

  const handleRunTests = async () => {
    if (!selectedQuestionId) {
      toast({ title: 'No Question Selected', description: 'Please select a question first.', variant: 'destructive' });
      return;
    }
    setIsEvaluating(true);
    setEvalStageIndex(0);
    setLogs([]);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: selectedQuestionId,
          student_id: 1,
          html_content: code.html,
          css_content: code.css,
          js_content: code.js
        })
      });

      const data = await res.json();
      
      if (!res.ok || data.status === 'failed') {
        toast({ title: 'Validation Failed', description: data.error || data.message || 'Syntax error', variant: 'destructive' });
        setIsEvaluating(false);
        return;
      }

      const submissionId = data.submission_id;
      const eventSource = new EventSource(`/api/submissions/${submissionId}/progress`);

      eventSource.onmessage = (e) => {
        const eventData = JSON.parse(e.data);
        
        if (eventData.log) {
          setLogs(prev => [...prev, eventData.log].slice(-5));
        }

        if (eventData.status === 'completed' || eventData.status === 'failed') {
          eventSource.close();
          setEvalStageIndex(EVALUATION_STAGES.length);
          
          setTimeout(() => {
            toast({
              title: "Evaluation Completed",
              description: "Redirecting to your results...",
            });
            navigate(`/results/${submissionId}`);
          }, 1500);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(() => navigate(`/results/${submissionId}`), 5000);
      };

    } catch (error) {
      toast({ title: 'Connection Error', description: 'Failed to connect to the evaluation engine.', variant: 'destructive' });
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (evalStageIndex >= 0 && evalStageIndex < EVALUATION_STAGES.length - 1) {
      const timer = setTimeout(() => {
        setEvalStageIndex(prev => prev + 1);
      }, EVALUATION_STAGES[evalStageIndex].duration);
      return () => clearTimeout(timer);
    }
  }, [evalStageIndex]);

  const handleAiFix = async () => {
    if (isEvaluating) return;
    
    toast({
      title: "AI Analysis Started",
      description: "Analyzing your code for potential improvements...",
    });

    try {
      const res = await fetch('/api/ai/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...code, prompt: "Improve accessibility and UI interactions" })
      });
      const data = await res.json();
      
      if (data.success) {
        setCode(data.fixedCode);
        toast({
          title: "Code Optimized ✨",
          description: data.explanation,
        });
      }
    } catch (e) {
      toast({ title: "AI Error", description: "Failed to reach the AI engine.", variant: "destructive" });
    }
  };

  return (
    <div className="practice-workspace h-full flex flex-col gap-6 relative overflow-hidden bg-gray-50/40 p-6">
      <div className="hud-scanline" />
      
      {/* HUD Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 z-10"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-indigo-600 text-[10px] font-black text-white rounded uppercase tracking-widest">System Online</div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none">Assessment <span className="text-indigo-600">Engine</span></h2>
          <div className="flex items-center gap-4 mt-2">
             <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100 glass-panel">
               <Zap size={14} className="text-amber-500" /> Challenge Selection
             </div>
             <select
                value={selectedQuestionId ?? ''}
                onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
                disabled={questionsLoading}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:opacity-60 shadow-sm"
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
          </div>
        </div>

        <div className="flex gap-3">
           <button
              onClick={handleAiFix}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm transition-all shadow-sm border border-indigo-100 active:scale-95 group"
            >
              <Sparkles size={16} className="group-hover:animate-spin" /> AI Fix-It
            </button>
           <button
              onClick={() => {
                setCode(starterCode);
                toast({ title: "Code Reset", description: "Your code has been reset." });
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold text-sm transition-all shadow-sm border border-gray-200 active:scale-95"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button 
              onClick={handleRunTests}
              disabled={isEvaluating || !selectedQuestionId}
              className="flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {isEvaluating ? (
                <><Loader2 size={18} className="animate-spin" /> RUNNING...</>
              ) : (
                <><Play size={18} fill="white" /> EVALUATE CODE</>
              )}
            </button>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_1.2fr] gap-6 min-h-0 z-10">
        {/* Requirement Panel */}
        <motion.div 
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="workspace-card flex flex-col overflow-hidden glass-panel hud-border"
        >
          <div className="workspace-card-header flex items-center justify-between !bg-transparent !border-b-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Activity size={16} /></div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Requirements</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-1">
             <QuestionPanel question={question} variant="workspace" />
          </div>
        </motion.div>

        {/* Editor Area */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="workspace-editor flex flex-col overflow-hidden bg-white/80 glass-panel shadow-2xl"
        >
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <Tabs.List className="workspace-tabs flex px-4 pt-4 gap-2 bg-transparent border-b-0">
              {['html', 'css', 'js'].map((lang) => (
                <Tabs.Trigger
                  key={lang}
                  value={lang}
                  className={cn(
                    "px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-t-xl transition-all border border-b-0",
                    activeTab === lang 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20" 
                      : "bg-white/50 text-gray-400 border-gray-100 hover:bg-gray-50/80"
                  )}
                >
                  {lang}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <div className="flex-1 min-h-0 p-4 pt-2">
              <div className="h-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                <CodeEditor 
                  language={activeTab === 'js' ? 'javascript' : activeTab}
                  value={code[activeTab]}
                  onChange={(val) => setCode(prev => ({ ...prev, [activeTab]: val }))}
                />
              </div>
            </div>
          </Tabs.Root>
        </motion.div>

        {/* Diagnostics & Preview */}
        <motion.div 
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-6"
        >
          <div className="workspace-card flex flex-col overflow-hidden min-h-[340px] glass-panel bg-white/40 shadow-xl border-emerald-500/20">
            <div className="workspace-preview-header flex items-center justify-between !bg-transparent !border-b-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-sm" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Live Preview</span>
              </div>
            </div>
            <div className="flex-1 relative p-4 pt-0">
              <div className="h-full rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white">
                <PreviewFrame html={code.html} css={code.css} js={code.js} />
              </div>
            </div>
          </div>

          <div className="workspace-card p-6 glass-panel hud-border shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center justify-between">
              <span>Diagnostics</span>
              <Terminal size={14} className="text-indigo-400" />
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><CheckCircle2 size={16} /></div>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-700">Static Checks</div>
                  <div className="text-[11px] font-medium text-emerald-600/80 leading-tight">Code structure verified successfully.</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                 <div className="flex-1 space-y-2">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full bg-indigo-500 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-gray-400">
                       <span>Perf</span>
                       <span>Optimized</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modern Pipeline Overlay */}
      <AnimatePresence>
        {isEvaluating && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-xl rounded-[2rem] shadow-[0_32px_128px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row"
            >
              <div className="bg-indigo-600 p-8 md:w-1/3 flex flex-col justify-between text-white relative">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={120} /></div>
                 <div>
                   <h3 className="text-2xl font-black leading-tight">V8 Engine <br/>Active</h3>
                   <p className="text-indigo-200 text-xs font-bold mt-2 uppercase tracking-widest">Pipeline 882</p>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full border-2 border-indigo-400 flex items-center justify-center text-[10px] font-black">AI</div>
                       <span className="text-[10px] font-black uppercase tracking-widest">Co-pilot Ready</span>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 md:w-2/3 space-y-6">
                <div className="space-y-4">
                  {EVALUATION_STAGES.map((stage, i) => {
                    const isActive = i === evalStageIndex;
                    const isPast = i < evalStageIndex;
                    return (
                      <div key={stage.id} className="group flex items-center gap-4">
                        <div className={cn(
                          "w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                          isActive ? "bg-indigo-600 scale-125 shadow-indigo-200 ring-4 ring-indigo-50" : isPast ? "bg-emerald-500" : "bg-gray-100"
                        )} />
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                            <span className={cn(isActive ? "text-indigo-600" : isPast ? "text-emerald-600" : "text-gray-400")}>
                               {stage.label}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: isPast ? "100%" : isActive ? "60%" : 0 }}
                              transition={isActive ? { duration: stage.duration / 1000, ease: "linear" } : { duration: 0.3 }}
                              className={cn("h-full rounded-full", isPast ? "bg-emerald-500" : "bg-indigo-600")}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {logs.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-900 rounded-2xl font-mono text-[10px] text-emerald-400 border border-emerald-500/20 shadow-inner">
                    {logs.map((log, i) => (
                      <div key={i} className="mb-1 opacity-80 blink animate-pulse">{`> ${log}`}</div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .practice-workspace::-webkit-scrollbar { display: none; }
        .hud-scanline {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(32, 255, 32, 0.02) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.01), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.01));
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
          z-index: 50;
        }
      `}} />
    </div>
  );
}
