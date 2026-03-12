import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  MessageSquareWarning, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Mocked Audit Log Interface representing PostgREST API payload
interface LLMAuditLog {
  id: string;
  evaluation_run_id: string;
  user_context: {
    failed_assertions: string[];
    assignment_context: string;
  };
  llm_response: {
    hint: string;
    concept_reference: string;
    encouragement: string;
  };
  teacher_rating?: number;
  hallucination_flag: boolean;
  created_at: string;
}

export function MLOpsDashboard() {
  const [logs, setLogs] = useState<LLMAuditLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Mocking the fetch from our backend's `llm_audit_logs` table
  useEffect(() => {
    const mockLogs: LLMAuditLog[] = [
      {
        id: "log-1",
        evaluation_run_id: "eval-901",
        user_context: {
          failed_assertions: ["Visual regression: 5.2% diff on header alignment. Expected flexbox center, found block."],
          assignment_context: "Box Model & Flexbox Fundamentals"
        },
        llm_response: {
          hint: "Your header contents are stacking vertically instead of laying out horizontally. What CSS property on the parent container dictates the layout dimension flow of its children?",
          concept_reference: "Flexbox Layout Direction",
          encouragement: "You're very close! Adjusting the parent container will lock everything into place."
        },
        hallucination_flag: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "log-2",
        evaluation_run_id: "eval-902",
        user_context: {
          failed_assertions: ["JS Logic: Submit button did not prevent default browser refresh."],
          assignment_context: "DOM Event Handling"
        },
        llm_response: {
          hint: "When clicking the submit button, the page seems to instantly reload. How do we tell the browser to stop its native form submission sequence within an EventListener?",
          concept_reference: "Event.preventDefault()",
          encouragement: "Mastering event cycles is crucial for single-page applications. Keep it up!"
        },
        hallucination_flag: false,
        created_at: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    setLogs(mockLogs);
  }, []);

  const handleRating = (logId: string, rating: number) => {
    // Optimistic UI Update representing a PUT request to the API
    setLogs(logs.map(log => log.id === logId ? { ...log, teacher_rating: rating } : log));
  };

  const handleFlag = (logId: string) => {
    setLogs(logs.map(log => log.id === logId ? { ...log, hallucination_flag: !log.hallucination_flag } : log));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-grayscale-200">
      <div className="p-6 border-b border-grayscale-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Pedagogical Telemetry
          </h2>
          <p className="text-sm text-grayscale-500 mt-1">Human-in-the-loop review for generative student hints.</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Prompts Tuned</div>
          <div className="flex items-center gap-1.5"><MessageSquareWarning className="w-4 h-4 text-yellow-500" /> Pending Review</div>
        </div>
      </div>

      <div className="divide-y divide-grayscale-200">
        {logs.map(log => (
          <div key={log.id} className={`p-6 transition-colors ${log.hallucination_flag ? 'bg-red-50' : 'hover:bg-grayscale-50'}`}>
            <div className="flex items-start justify-between">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono bg-grayscale-200 text-grayscale-700 px-2 py-1 rounded">Run: {log.evaluation_run_id}</span>
                  <span className="text-xs font-medium text-grayscale-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                  {log.teacher_rating && (
                    <span className="text-xs font-medium text-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Reviewed
                    </span>
                  )}
                </div>
                
                <h3 className="font-semibold text-sm text-black mb-1">Failed Assertion</h3>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100 mb-4 font-mono w-fit">
                  {log.user_context.failed_assertions[0]}
                </p>

                <h3 className="font-semibold text-sm text-black mb-1">AI Generated Hint</h3>
                <p className="text-sm text-grayscale-800 italic bg-white p-3 rounded-md border border-grayscale-300 shadow-inner">
                  "{log.llm_response.hint}"
                </p>
              </div>

              {/* Human-in-the-Loop Review Controls */}
              <div className="flex flex-col items-end gap-3 ml-6 min-w-[140px]">
                <span className="text-xs font-semibold text-grayscale-500 uppercase tracking-wider">Rate Helpfulness</span>
                <div className="flex bg-grayscale-100 rounded-lg p-1">
                  <button 
                    onClick={() => handleRating(log.id, 5)}
                    className={`p-2 rounded-md transition-all ${log.teacher_rating === 5 ? 'bg-white shadow-sm text-primary' : 'text-grayscale-400 hover:text-grayscale-600'}`}
                    title="Helpful & Socratic"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleRating(log.id, 1)}
                    className={`p-2 rounded-md transition-all ${log.teacher_rating === 1 ? 'bg-white shadow-sm text-red-500' : 'text-grayscale-400 hover:text-grayscale-600'}`}
                    title="Directly solved or unhelpful"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={() => handleFlag(log.id)}
                  className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${log.hallucination_flag ? 'bg-red-100 text-red-700' : 'text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200'}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Flag Hallucination
                </button>
              </div>
            </div>

            {/* Expandable Details */}
            <div className="mt-4">
              <button 
                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
              >
                {expandedLogId === log.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expandedLogId === log.id ? 'Hide Technical Context' : 'View Technical Context'}
              </button>
              
              {expandedLogId === log.id && (
                <div className="mt-3 p-4 bg-grayscale-100 rounded-lg border border-grayscale-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-grayscale-500 block mb-1">Target Concept</span>
                    <span className="text-sm font-medium text-black bg-white px-2 py-1 rounded inline-block">
                      {log.llm_response.concept_reference}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-grayscale-500 block mb-1">Encouragement String</span>
                    <span className="text-sm text-grayscale-700 italic">
                      "{log.llm_response.encouragement}"
                    </span>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
