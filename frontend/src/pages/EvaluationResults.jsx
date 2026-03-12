import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import ScoreGauge from '../components/results/ScoreGauge';
import AIFeedbackCard from '../components/results/AIFeedbackCard';
import FailedTestsTable from '../components/results/FailedTestsTable';
import DiffViewer from '../components/results/DiffViewer';

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
        if (id === 'demo-123') {
          // Keep mock for the specific demo route
          setResult({
            status: 'completed',
            submission_id: 'demo-123',
            total_score: 78.5,
            scores: { html: 18, css: 25.5, js: 35, visual: 0 },
            mismatchPercent: 8.45,
            visualArtifacts: {
              expected: '/mocks/expected.svg',
              actual: '/mocks/actual.svg',
              diff: '/mocks/diff.svg',
              boxes: []
            },
            failedTests: [
              { testId: 'css_flexbox_missing', hint: 'The .card container needs display:flex to align children side-by-side.', selector: '.card' },
              { testId: 'css_button_hover', hint: 'Button background on hover does not match specified color #312e81.', selector: 'button:hover' }
            ],
            aiFeedback: {
              summary: "Your JavaScript logic is perfect and HTML structure is mostly correct. However, your CSS layout completely missed the flexbox requirement, causing a large visual diff deviation.",
              suggestions: ["Add 'display: flex' and 'align-items: center' to your main .card class.", "Ensure the button hover transition matches exactly 0.2s duration.", "Your image border radius is slightly off (expected 50%, actual 8px)."],
              difficulty_estimate: "Easy",
              high_diff_cause: "Flexbox layout completely missing on parent container."
            }
          });
          setLoading(false);
          return;
        }

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

    // Poll every 2 seconds until the run completes/fails
    fetchResult();
    intervalId = setInterval(() => {
      if (!stopped) fetchResult();
    }, 2000);

    // Optional: stream progress stages while polling for final artifacts.
    if (id !== 'demo-123') {
      try {
        eventSource = new EventSource(`http://localhost:4000/api/submissions/${id}/progress`);
        eventSource.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg?.progress?.stage) setProgressStage(msg.progress.stage);
          } catch (_) {}
        };
        eventSource.onerror = () => {
          // If SSE fails (proxy/CORS), polling still works.
          if (eventSource) eventSource.close();
          eventSource = null;
        };
      } catch (_) {}
    }

    return () => stop();
  }, [id]);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  if (error || !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Evaluation Error</h2>
        <p className="text-gray-500">{error || "Could not load evaluation report."}</p>
        <Link to="/student" className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Return to Workspace</Link>
      </div>
    );
  }

  const scores = result.scores || { html: 0, css: 0, js: 0, visual: 0 };
  const totalScore =
    result.total_score ?? (scores.html + scores.css + scores.js + scores.visual);
  const visual = result.visualArtifacts || null;
  const mismatchPercent = Number(result.mismatchPercent || 0);
  const failedTests = result.failedTests || [];
  const aiFeedback = result.aiFeedback || { summary: "No AI feedback generated.", suggestions: [] };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/student" className="text-gray-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Evaluation Report</h1>
          </div>
          <p className="text-sm text-gray-500 font-mono ml-7">ID: {result.submission_id}</p>
          {(result.status === 'running' || result.status === 'pending') && (
            <p className="text-xs text-gray-500 ml-7 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse mr-2" />
              {progressStage ? `Stage: ${progressStage}` : 'Evaluating...'}
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto ml-7 sm:ml-0">
          <button className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold transition-colors flex">
            <Download size={16} /> Export PDF
          </button>
          <Link to="/student" className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-indigo-600/20 flex">
            Next Challenge <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Scores & AI */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main Score Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest w-full text-center mb-6 border-b border-gray-50 pb-4">Overall Grade</h3>
             <ScoreGauge score={totalScore} size="lg" />
             
              {/* Sub-scores */}
              <div className="w-full mt-8 space-y-4">
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>HTML</span> <span>{scores.html}/20</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(scores.html/20)*100}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>CSS</span> <span>{scores.css}/35</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(scores.css/35)*100}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>JavaScript</span> <span>{scores.js}/35</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(scores.js/35)*100}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between text-xs font-semibold text-gray-600">
                     <span>Visual Match</span> <span>{scores.visual}/10</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(scores.visual/10)*100}%` }}></div>
                   </div>
                 </div>
              </div>
          </div>

          <AIFeedbackCard feedback={aiFeedback} />
          
        </div>

        {/* Right Column: Diff & Tests */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           
           <DiffViewer 
             expectedUrl={visual?.expected || ''}
             actualUrl={visual?.actual || ''}
             diffUrl={visual?.diff || ''}
             mismatchPercentage={mismatchPercent}
             boxes={visual?.boxes || []}
           />

           <FailedTestsTable failedTests={failedTests} />

         </div>

       </div>

    </div>
  );
}
