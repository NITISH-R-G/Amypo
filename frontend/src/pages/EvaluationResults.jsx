import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, ShieldCheck, AlertTriangle, Info, Zap, Layout, Code2, Eye, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import ScoreGauge from '../components/results/ScoreGauge';
import AIFeedbackCard from '../components/results/AIFeedbackCard';
import FailedTestsTable from '../components/results/FailedTestsTable';
import DiffViewer from '../components/results/DiffViewer';
import { cn } from '../utils/utils';

export default function EvaluationResults() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressStage, setProgressStage] = useState(null);

  useEffect(() => {
    let intervalId = null;
    let eventSource = null;
    let stopped = false;

    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      if (eventSource) eventSource.close();
      eventSource = null;
      stopped = true;
    };

    const fetchResult = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/submissions/${id}/result`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch evaluation result');

        setResult(data);
        setError(null);

        if (data.status === 'completed' || data.status === 'failed') {
          stop();
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
    intervalId = setInterval(() => {
      if (!stopped) fetchResult();
    }, 2000);

    return () => stop();
  }, [id]);

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-gray-50/50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (error || !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 text-center p-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">System Fault</h2>
        <p className="text-gray-500 max-w-md mx-auto font-medium">{error || "The requested evaluation report could not be compiled."}</p>
        <Link to="/student" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all">Return to Workspace</Link>
      </div>
    );
  }

  const scores = result.scores || { html: 0, css: 0, js: 0, visual: 0, a11y: 0 };
  const breakdown = result.breakdown || scores;
  const totalScore = result.total_score || 0;
  const visual = result.visualArtifacts || null;
  const mismatchPercent = Number(result.mismatchPercent || 0);
  const failedTests = result.failedTests || [];
  const a11yViolations = result.a11yViolations || [];
  const aiFeedback = result.aiFeedback || { summary: "No AI feedback generated.", suggestions: [] };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-8 pb-12 p-6 overflow-hidden">
      <div className="hud-scanline opacity-5" />
      
      {/* HUD Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 glass-panel p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 -mr-10 -mt-10"><Activity size={240} /></div>
        <div className="z-10">
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 bg-indigo-600 text-[10px] font-black text-white rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-600/20">Analysis Finalized</div>
             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 font-mono">Run: {result.submission_id}</div>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none mb-2">Performance <span className="text-indigo-600">Audit</span></h1>
          <p className="text-gray-500 font-bold flex items-center gap-2 text-sm">
             <Info size={16} className="text-indigo-400" /> Multi-vector scoring engine completed successfully
          </p>
        </div>
        <div className="flex gap-4 w-full lg:w-auto z-10">
          <button className="flex-1 lg:flex-none justify-center items-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95 flex">
            <Download size={18} /> EXPORT PDF
          </button>
          <Link to="/student" className="flex-1 lg:flex-none justify-center items-center gap-3 px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex uppercase tracking-wider">
            Next Level <ArrowRight size={18} />
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* Left Column: Grade & Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-8 h-full min-h-0">
          
          {/* Main Grade Card */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-10 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col items-center relative overflow-hidden group"
          >
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-pink-500" />
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] w-full text-center mb-10">Verification Score</h3>
             
             <div className="relative group p-4 rounded-full bg-white shadow-2xl shadow-indigo-100/50 ring-4 ring-gray-50/50">
               <ScoreGauge score={totalScore} size="lg" />
               <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
             </div>
             
              {/* Metric Breakdown */}
              <div className="w-full mt-12 space-y-6">
                 {[
                   { label: 'DOM Structure', score: breakdown.dom, max: 100, color: 'bg-blue-500', icon: <Layout size={14} /> },
                   { label: 'CSS Compliance', score: breakdown.css, max: 100, color: 'bg-pink-500', icon: <Code2 size={14} /> },
                   { label: 'Visual Pixel Match', score: breakdown.visual, max: 100, color: 'bg-emerald-500', icon: <Eye size={14} /> },
                   { label: 'Accessibility (A11y)', score: breakdown.a11y || 0, max: 100, color: 'bg-amber-500', icon: <ShieldCheck size={14} /> },
                 ].map((metric) => (
                   <div key={metric.label} className="space-y-2">
                     <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                       <span className="flex items-center gap-2 text-gray-500">{metric.icon} {metric.label}</span>
                       <span className="text-gray-900">{metric.score}/{metric.max}</span>
                     </div>
                     <div className="w-full h-2 bg-gray-100/50 rounded-full overflow-hidden border border-gray-50">
                       <motion.div 
                         initial={{ width: 0 }} animate={{ width: `${(metric.score/metric.max)*100}%` }}
                         className={cn("h-full rounded-full shadow-sm", metric.color)} 
                       />
                     </div>
                   </div>
                 ))}
              </div>
          </motion.div>

          <AIFeedbackCard feedback={aiFeedback} />
          
        </div>

        {/* Right Column: Visualizer & Violations */}
        <div className="lg:col-span-8 flex flex-col gap-8 h-full min-h-0">
           
           <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
             <DiffViewer 
               expectedUrl={visual?.expected || ''}
               actualUrl={visual?.actual || ''}
               diffUrl={visual?.diff || ''}
               mismatchPercentage={mismatchPercent}
               boxes={visual?.boxes || []}
             />
           </motion.div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0 flex-1">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="min-h-0 h-full">
                <FailedTestsTable failedTests={failedTests} />
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                className="glass-panel p-8 rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col h-full"
              >
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                       <ShieldCheck size={16} className="text-amber-500" /> A11y Violations
                    </h3>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      a11yViolations.length === 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {a11yViolations.length} Detected
                    </span>
                 </div>
                 
                 <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-hide">
                    {a11yViolations.length > 0 ? a11yViolations.map((v, i) => (
                      <div key={i} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-lg hover:shadow-gray-200/20">
                         <div className="flex items-start gap-4">
                            <div className={cn(
                              "mt-1 p-2 rounded-lg",
                              v.impact === 'critical' ? "bg-red-100 text-red-500" : "bg-amber-100 text-amber-500"
                            )}>
                               <AlertTriangle size={14} />
                            </div>
                            <div className="min-w-0">
                               <div className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">{v.id}</div>
                               <div className="text-[11px] font-bold text-gray-500 leading-normal">{v.description}</div>
                            </div>
                         </div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                         <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
                            <Zap size={32} />
                         </div>
                         <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">A11y Optimized</h4>
                         <p className="text-xs text-gray-500 font-bold mt-2 leading-relaxed">No accessibility violations were found. Your code is compliant with WCAG standards.</p>
                      </div>
                    )}
                 </div>
              </motion.div>
           </div>
         </div>
      </div>
    </div>
  );
}
