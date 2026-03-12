import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

const API_BASE = '/api';

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const requestedQuestionId = Number(searchParams.get('questionId') || 0) || null;
  const [questionId, setQuestionId] = useState(requestedQuestionId);

  useEffect(() => {
    let cancelled = false;
    async function loadQuestions() {
      setQuestionsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/questions`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to load questions');
        if (cancelled) return;
        const qs = Array.isArray(json.questions) ? json.questions : [];
        setQuestions(qs);
        const requested = requestedQuestionId && qs.some((x) => x.id === requestedQuestionId) ? requestedQuestionId : null;
        if (requested) setQuestionId(requested);
        else if (!questionId && qs.length > 0) setQuestionId(qs[0].id);
      } catch (_) {
        // Non-fatal: analytics can still try with current questionId.
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }

    loadQuestions();
    return () => { cancelled = true; };
  }, [requestedQuestionId]); // intentional: react to URL changes

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!questionId) {
          setData(null);
          return;
        }
        const res = await fetch(`${API_BASE}/trainer/analytics/questions/${questionId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const activeQuestion = useMemo(() => questions.find((q) => q.id === questionId) || null, [questions, questionId]);

  const visualBuckets = Object.entries(data?.visualDiffDist || {});
  const visualTotal = visualBuckets.reduce((acc, [, v]) => acc + (Number(v) || 0), 0);
  const visualMax = visualBuckets.reduce((acc, [, v]) => Math.max(acc, Number(v) || 0), 0) || 1;

  const hist = data?.scoreHistogram || [0, 0, 0, 0, 0];
  const histMax = Math.max(...hist.map((n) => Number(n) || 0), 1);
  const completedCount = hist.reduce((acc, n) => acc + (Number(n) || 0), 0);

  const cardBase =
    "rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-200 hover:shadow-md";

  return (
    <div className="w-full h-full">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-14">
        <div className="pt-8 pb-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-slate-900">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <BarChart3 className="text-emerald-700" size={18} />
                </span>
                <h1 className="text-[30px] leading-tight font-black tracking-tight">Analytics</h1>
              </div>
              <p className="mt-2 text-sm sm:text-base text-slate-500">
                Cohort-level insights for Question {questionId || 1}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Question</div>
              <select
                value={questionId ?? ''}
                disabled={questionsLoading || questions.length === 0}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setQuestionId(next);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('questionId', String(next));
                    return p;
                  });
                }}
                className="min-w-[260px] max-w-[420px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 disabled:opacity-60"
              >
                {questions.length === 0 ? (
                  <option value="">No questions</option>
                ) : (
                  questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          {activeQuestion?.title && (
            <div className="mt-2 text-xs text-slate-500">
              Viewing: <span className="font-semibold text-slate-700">{activeQuestion.title}</span>
            </div>
          )}
        </div>

      {loading && (
        <div className={`${cardBase} mt-6 p-6 text-slate-600 text-sm`}>
          Loading analytics...
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`${cardBase} p-6`}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">AVG SCORE</div>
              <div className="mt-3 text-[40px] leading-none font-black tracking-tight text-emerald-700">
                {data.avgScore ?? 0}
              </div>
              <div className="mt-3 text-xs text-slate-500">Across {completedCount} completed submissions</div>
            </div>

            <div className={`${cardBase} p-6`}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">AVG EXEC</div>
              <div className="mt-3 text-[40px] leading-none font-black tracking-tight text-slate-900">
                {data.avgExecutionTimeMs ?? 0}
                <span className="ml-2 text-base font-bold text-slate-500">ms</span>
              </div>
              <div className="mt-3 text-xs text-slate-500">Puppeteer evaluation time</div>
            </div>

            <div className={`${cardBase} p-6`}>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">VISUAL DIFF DIST</div>
              <div className="mt-4 space-y-3">
                {visualBuckets.length === 0 ? (
                  <div className="text-sm text-slate-500">No visual diff data yet.</div>
                ) : (
                  visualBuckets.map(([k, v]) => {
                    const n = Number(v) || 0;
                    const pct = visualTotal > 0 ? (n / visualTotal) * 100 : 0;
                    const rel = (n / visualMax) * 100;
                    return (
                      <div key={k} className="grid grid-cols-[80px_1fr_40px] items-center gap-3">
                        <div className="text-xs font-semibold text-slate-600">{k}</div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.max(2, rel)}%` }}
                            aria-label={`${k}: ${n}`}
                          />
                        </div>
                        <div className="text-xs font-bold text-slate-700 text-right" title={`${pct.toFixed(1)}%`}>
                          {n}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

            <div className={`${cardBase} mt-6 p-6`}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-slate-900">Score Distribution</h2>
              <div className="text-xs text-slate-500">Buckets (0-20 ... 81-100)</div>
            </div>
            <div
              className="mt-5 h-44 rounded-2xl border border-slate-200/60 bg-white px-4 py-5"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(148,163,184,0.22) 1px, transparent 1px)",
                backgroundSize: "100% 22px"
              }}
            >
              <div className="h-full grid grid-cols-5 gap-3 items-end">
                {hist.map((v, idx) => {
                  const n = Number(v) || 0;
                  const h = (n / histMax) * 100;
                  return (
                    <div key={idx} className="h-full flex flex-col justify-end items-center gap-2">
                      <div className="text-[11px] text-slate-500 font-semibold tabular-nums">{n}</div>
                      <div className="w-full flex justify-center">
                        <div
                          className="w-full max-w-16 rounded-xl bg-emerald-500/85 shadow-sm"
                          style={{ height: `${Math.max(6, h)}%` }}
                          title={String(n)}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 text-center">
                        {['0-20', '21-40', '41-60', '61-80', '81-100'][idx]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

          <div className={`${cardBase} mt-6 p-6`}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-slate-900">Common Failed Tests</h2>
              <div className="text-xs text-slate-500">Top 10 by frequency</div>
            </div>
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Object.entries(data.failedTestsFrequency || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-2xl border border-slate-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4 hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Test</div>
                      <div className="mt-1 font-mono text-xs text-slate-800 truncate" title={k}>{k}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fails</div>
                      <div className="mt-1 text-sm font-black text-slate-900 tabular-nums">{v}</div>
                    </div>
                  </div>
                ))}
              {(!data.failedTestsFrequency || Object.keys(data.failedTestsFrequency).length === 0) && (
                <div className="text-sm text-slate-500">No failed test frequency data yet.</div>
              )}
            </div>
          </div>
        </>
      )}
      {!loading && !error && (!data || !questionId) && (
        <div className={`${cardBase} mt-6 p-6 text-slate-600 text-sm`}>
          Select a question to view cohort analytics.
        </div>
      )}
      </div>
    </div>
  );
}

