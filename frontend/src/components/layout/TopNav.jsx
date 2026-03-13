import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, FileVideo, Target, Moon, Sun } from 'lucide-react';
import { cn } from '../../utils/utils';
import { useNotifications } from '../ui/NotificationHub';

export default function TopNav({ toggleSidebar, theme = 'light', toggleTheme }) {
  const navigate = useNavigate();
  const { addNotification } = useNotifications() || { addNotification: null };
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const cacheRef = useRef({ questions: null, submissions: null, fetchedAt: 0 });

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    const onDown = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const fetchDataIfNeeded = async () => {
    const now = Date.now();
    if (cacheRef.current.questions && cacheRef.current.submissions && (now - cacheRef.current.fetchedAt) < 30_000) {
      setQuestions(cacheRef.current.questions);
      setSubmissions(cacheRef.current.submissions);
      return;
    }

    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/submissions?limit=80')
      ]);

      const qJson = await qRes.json().catch(() => ({}));
      const sJson = await sRes.json().catch(() => ([]));

      const qs = Array.isArray(qJson?.questions) ? qJson.questions : [];
      const ss = Array.isArray(sJson) ? sJson : (Array.isArray(sJson?.items) ? sJson.items : []);

      cacheRef.current = { questions: qs, submissions: ss, fetchedAt: Date.now() };
      setQuestions(qs);
      setSubmissions(ss);
    } catch (_) {
      // Non-fatal: search should not break navigation.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let t = setTimeout(() => {
      fetchDataIfNeeded();
    }, 150);
    return () => clearTimeout(t);
  }, [open]);

  const filteredQuestions = useMemo(() => {
    if (!normalized) return questions.slice(0, 6);
    return questions
      .filter((q) => String(q?.title || '').toLowerCase().includes(normalized) || String(q?.id || '').includes(normalized))
      .slice(0, 6);
  }, [questions, normalized]);

  const filteredSubmissions = useMemo(() => {
    const list = submissions || [];
    if (!normalized) return list.slice(0, 6);
    return list
      .filter((s) => {
        const id = String(s?.id || '');
        const title = String(s?.Question?.title || '').toLowerCase();
        return id.includes(normalized) || title.includes(normalized) || String(s?.status || '').toLowerCase().includes(normalized);
      })
      .slice(0, 6);
  }, [submissions, normalized]);

  const goQuestion = (qid) => {
    setOpen(false);
    setQuery('');
    navigate(`/student?question=${encodeURIComponent(String(qid))}`);
  };

  const goSubmission = (sid) => {
    setOpen(false);
    setQuery('');
    navigate(`/results/${encodeURIComponent(String(sid))}`);
  };

  const onSubmitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    navigate(`/submissions?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div ref={containerRef} className="relative hidden md:block w-72">
          <button
            type="button"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => inputRef.current?.focus()}
            aria-label="Focus search"
          >
            <Search size={16} />
          </button>
          <input 
            type="text" 
            placeholder="Search questions, submissions..." 
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitSearch();
              if (e.key === 'Escape') setOpen(false);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 rounded-lg text-sm transition-all outline-none"
          />

          {open && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Search</div>
                {loading && <div className="text-xs text-gray-400">Loading...</div>}
              </div>

              <div className="max-h-80 overflow-auto">
                <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Questions</div>
                {filteredQuestions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No matching questions</div>
                ) : (
                  filteredQuestions.map((q) => (
                    <button
                      key={`q-${q.id}`}
                      type="button"
                      onClick={() => goQuestion(q.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors',
                        'border-b border-gray-50'
                      )}
                    >
                      <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Target size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{q.title}</div>
                        <div className="text-xs text-gray-500">Question ID: {q.id}</div>
                      </div>
                    </button>
                  ))
                )}

                <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Submissions</div>
                {filteredSubmissions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No matching submissions</div>
                ) : (
                  filteredSubmissions.map((s) => (
                    <button
                      key={`s-${s.id}`}
                      type="button"
                      onClick={() => goSubmission(s.id)}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors border-b border-gray-50"
                    >
                      <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileVideo size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          Submission #{s.id}{' '}
                          <span className="text-xs font-bold text-gray-500">({s.status || 'unknown'})</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{s?.Question?.title ? `Q: ${s.Question.title}` : 'Question'}</div>
                      </div>
                      <div className="text-xs font-mono text-gray-500">{s.total_score ?? '-'}</div>
                    </button>
                  ))
                )}
              </div>

              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">Press Enter to search in submissions</div>
                <button
                  type="button"
                  onClick={onSubmitSearch}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Search
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => {
            if (typeof toggleTheme === 'function') toggleTheme();
          }}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => {
            if (typeof addNotification === 'function') {
              addNotification('info', 'Notifications', 'No new notifications right now.');
            }
          }}
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>
        
        <div className="h-8 w-px bg-gray-200 mx-1"></div>
        
        <button
          className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200"
          onClick={() => navigate('/settings')}
          aria-label="Account menu"
          title="Open settings"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            ST
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-gray-700 leading-tight">Student Test</p>
            <p className="text-xs text-gray-500">Free Tier</p>
          </div>
        </button>
      </div>
    </header>
  );
}

