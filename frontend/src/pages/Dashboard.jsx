import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileVideo, TerminalSquare, Flame, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextModule, setNextModule] = useState({ title: null, questionId: null });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/1');
        const data = await res.json();
        setUser(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          fetch('/api/questions'),
          fetch('/api/submissions?student_id=1&limit=200')
        ]);
        const qJson = await qRes.json().catch(() => ({}));
        const sJson = await sRes.json().catch(() => ([]));
        const questions = Array.isArray(qJson?.questions) ? qJson.questions : [];
        const submissions = Array.isArray(sJson) ? sJson : [];

        const completed = new Set(
          submissions
            .filter((s) => String(s?.status || '').toLowerCase() === 'completed')
            .map((s) => Number(s?.question_id))
            .filter(Boolean)
        );

        const next = questions
          .slice()
          .sort((a, b) => Number(a?.order_index ?? a?.id) - Number(b?.order_index ?? b?.id))
          .find((q) => !completed.has(Number(q?.id)));

        if (!cancelled) {
          setNextModule({
            title: next?.title || (questions.length ? 'All modules complete' : null),
            questionId: next?.id ?? null
          });
        }
      } catch (_) {
        // Non-fatal; keep the roadmap card functional.
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 mt-1 font-medium italic">
            "Consistency is the key to mastering the craft."
          </p>
        </div>
        
        {/* Streak Component */}
        {loading ? (
          <div className="bg-gray-100/50 w-48 h-[72px] rounded-2xl animate-pulse" />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-100 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Flame size={24} fill="white" />
            </div>
            <div>
              <div className="text-2xl font-black text-orange-600 leading-none">{user?.current_streak || 0} Days</div>
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">Current Streak</div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Link 
          to="/roadmap"
          className="lg:col-span-2 relative overflow-hidden bg-emerald-600 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-100 group transition-all hover:-translate-y-1"
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-6">
                <BookOpen size={20} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Learning Roadmap</h2>
              <p className="text-emerald-100 font-medium text-sm leading-relaxed max-w-sm">
                Track your progress through the professional web development curriculum.
              </p>
              
              {/* Next Up Module */}
              <div className="mt-6 flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 w-fit">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white shrink-0">
                   <ChevronRight size={24} />
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Next Module</div>
                   <div className="text-sm font-bold text-white">{nextModule.title || 'Loading...'}</div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-white font-bold text-sm">
              Resume Journey <ArrowRight size={16} />
            </div>
          </div>
          
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl opacity-30" />
        </Link>
        <Link
          to="/student"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TerminalSquare size={22} />
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-emerald-600 transition-colors" size={20} />
          </div>
          <h2 className="mt-4 font-bold text-gray-900">Practice Workspace</h2>
          <p className="text-sm text-gray-500 mt-1">Write code and run evaluations.</p>
        </Link>

        <Link
          to="/submissions"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileVideo size={22} />
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-emerald-600 transition-colors" size={20} />
          </div>
          <h2 className="mt-4 font-bold text-gray-900">My Submissions</h2>
          <p className="text-sm text-gray-500 mt-1">Track status, score, and reports.</p>
        </Link>

        <Link
          to="/analytics"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BarChart3 size={22} />
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-emerald-600 transition-colors" size={20} />
          </div>
          <h2 className="mt-4 font-bold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Cohort performance and common failures.</p>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900">Quick Links</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/trainer" className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
            Trainer Panel
          </Link>
          <Link to="/admin" className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
            Admin Operations
          </Link>
          <Link to="/welcome" className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
            Product Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

