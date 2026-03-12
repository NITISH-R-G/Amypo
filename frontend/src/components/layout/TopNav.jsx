import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, FileText, ClipboardList, Moon, Sun, ChevronRight } from 'lucide-react';

export default function TopNav({ toggleSidebar }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  const [theme, setTheme] = useState('light');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const rightRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [qRes, sRes] = await Promise.all([
          fetch('/api/questions'),
          fetch('/api/submissions?student_id=1&limit=50')
        ]);
        const qData = await qRes.json().catch(() => ({}));
        const sData = await sRes.json().catch(() => ([]));
        if (!cancelled) {
          setQuestions(Array.isArray(qData.questions) ? qData.questions : []);
          setSubmissions(Array.isArray(sData) ? sData : (sData.items || []));
        }
      } catch (_) {
        // Non-blocking: search will just be empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    const saved = localStorage.getItem('amypo-theme');
    const initial = saved === 'dark' || saved === 'light' ? saved : 'light';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (!rightRef.current) return;
      if (rightRef.current.contains(e.target)) return;
      setNotifOpen(false);
      setUserOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const trimmed = q.trim();
  const results = useMemo(() => {
    if (trimmed.length < 2) return { questions: [], submissions: [] };
    const needle = trimmed.toLowerCase();
    const qMatches = questions
      .filter((x) => (x?.title || '').toLowerCase().includes(needle) || (x?.description || '').toLowerCase().includes(needle))
      .slice(0, 6);
    const sMatches = submissions
      .filter((s) => String(s?.id || '').includes(needle) || (s?.Question?.title || '').toLowerCase().includes(needle))
      .slice(0, 6);
    return { questions: qMatches, submissions: sMatches };
  }, [questions, submissions, trimmed]);

  const close = () => setOpen(false);

  const goQuestion = (id) => {
    close();
    setQ('');
    navigate(`/student?questionId=${id}`);
  };

  const goSubmission = (id) => {
    close();
    setQ('');
    navigate(`/results/${id}`);
  };

  const onSubmit = () => {
    if (!trimmed) return;
    close();
    navigate(`/submissions?query=${encodeURIComponent(trimmed)}`);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('amypo-theme', next);
    document.documentElement.dataset.theme = next;
  };

  const recentSubmissions = useMemo(() => {
    const items = Array.isArray(submissions) ? submissions : [];
    return items.slice(0, 6);
  }, [submissions]);

  const unreadCount = useMemo(() => {
    // Simple heuristic: consider "pending/running/failed" as attention-worthy.
    const items = Array.isArray(submissions) ? submissions : [];
    return items.filter((s) => ['pending', 'running', 'failed'].includes(String(s?.status || '').toLowerCase())).length;
  }, [submissions]);

  return (
    <header className="app-topnav h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div ref={boxRef} className="relative hidden md:block w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" 
            placeholder="Search questions, submissions..." 
            value={q}
            ref={inputRef}
            className="topnav-search w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-lg text-sm transition-all outline-none"
            onChange={(e) => {
              setQ(e.target.value);
              const next = e.target.value.trim();
              setOpen(next.length >= 2);
            }}
            onFocus={() => setOpen(trimmed.length >= 2)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              if (e.key === 'Enter') onSubmit();
            }}
          />

          {open && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Results</span>
                {loading && <span className="text-gray-400 font-semibold normal-case">Loading…</span>}
              </div>

              <div className="max-h-80 overflow-auto">
                <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</div>
                {results.questions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No question matches</div>
                ) : (
                  results.questions.map((x) => (
                    <button
                      key={`q-${x.id}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goQuestion(x.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2"
                    >
                      <FileText size={16} className="mt-0.5 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{x.title}</div>
                        <div className="text-xs text-gray-500 truncate">ID: {x.id}</div>
                      </div>
                    </button>
                  ))
                )}

                <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</div>
                {results.submissions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No submission matches</div>
                ) : (
                  results.submissions.map((s) => (
                    <button
                      key={`s-${s.id}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goSubmission(s.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2"
                    >
                      <ClipboardList size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">Submission #{s.id}</div>
                        <div className="text-xs text-gray-500 truncate">{s?.Question?.title ? `Question: ${s.Question.title}` : `Question ID: ${s.question_id}`}</div>
                      </div>
                    </button>
                  ))
                )}

                {(results.questions.length === 0 && results.submissions.length === 0) && (
                  <div className="px-3 py-3 text-sm text-gray-500 border-t border-gray-100">
                    Try a longer search, like “demo” or a submission id.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={rightRef} className="flex items-center gap-3 relative">
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="h-8 w-px bg-gray-200 mx-1"></div>

        <button
          onClick={() => {
            setUserOpen(false);
            setNotifOpen((v) => !v);
          }}
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Notifications"
          aria-expanded={notifOpen}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-14 w-[340px] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">Notifications</div>
              <div className="text-xs text-gray-500">{recentSubmissions.length} recent</div>
            </div>
            <div className="max-h-80 overflow-auto">
              {recentSubmissions.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">No submissions yet.</div>
              ) : (
                recentSubmissions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setNotifOpen(false);
                      navigate(`/results/${s.id}`);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        Submission #{s.id}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {s?.Question?.title ? `Question: ${s.Question.title}` : `Question ID: ${s.question_id}`}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        Status: <span className="font-semibold">{s.status || 'unknown'}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-3 bg-white border-t border-gray-100">
              <button
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/submissions');
                }}
                className="w-full text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                View all submissions
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setNotifOpen(false);
            setUserOpen((v) => !v);
          }}
          className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200"
          aria-label="User menu"
          aria-expanded={userOpen}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            ST
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-gray-700 leading-tight">Student Test</p>
            <p className="text-xs text-gray-500">Free Tier</p>
          </div>
        </button>

        {userOpen && (
          <div className="absolute right-0 top-14 w-[260px] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="text-sm font-bold text-gray-900">Student Test</div>
              <div className="text-xs text-gray-500">Free Tier</div>
            </div>
            <div className="py-2">
              <button onClick={() => { setUserOpen(false); navigate('/student'); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Practice Workspace</button>
              <button onClick={() => { setUserOpen(false); navigate('/submissions'); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">My Submissions</button>
              <button onClick={() => { setUserOpen(false); navigate('/trainer'); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Trainer Panel</button>
              <button onClick={() => { setUserOpen(false); navigate('/analytics'); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Analytics</button>
              <button onClick={() => { setUserOpen(false); navigate('/settings'); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Settings</button>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              <button onClick={() => { setUserOpen(false); toggleTheme(); }} className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900">
                <span>Theme</span>
                <span className="text-xs text-gray-500">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
