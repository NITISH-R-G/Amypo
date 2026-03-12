import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '../utils/utils';

const API_BASE = 'http://localhost:4000/api';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch (_) {
    return iso || '';
  }
}

export default function SubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Demo/student dashboard hardcodes student_id=1 today; mirror it here.
  const studentId = 1;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/submissions?student_id=${studentId}&limit=50`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load submissions');
        if (!cancelled) setItems(Array.isArray(data) ? data : data.items || []);
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
  }, [refreshTick]);

  const stats = useMemo(() => {
    const total = items.length;
    const byStatus = items.reduce((acc, s) => {
      const key = s.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, byStatus };
  }, [items]);

  const query = (searchParams.get('query') || '').trim();
  const filteredItems = useMemo(() => {
    if (!query) return items;
    const needle = query.toLowerCase();
    return items.filter((s) => {
      const idMatch = String(s?.id || '').includes(needle);
      const qTitle = s?.Question?.title || '';
      const qMatch = qTitle.toLowerCase().includes(needle);
      return idMatch || qMatch;
    });
  }, [items, query]);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Recent evaluations for your account{query ? ` (filtered: "${query}")` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {query && (
            <button
              onClick={() => setSearchParams({})}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold"
            >
              Clear Filter
            </button>
          )}
          <button
            onClick={() => setRefreshTick(t => t + 1)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</div>
          <div className="mt-2 text-3xl font-black text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed</div>
          <div className="mt-2 text-3xl font-black text-emerald-600">{stats.byStatus.completed || 0}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Failed</div>
          <div className="mt-2 text-3xl font-black text-red-600">{stats.byStatus.failed || 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent</h2>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-6 py-3">ID</th>
                  <th className="text-left font-semibold px-6 py-3">Status</th>
                  <th className="text-left font-semibold px-6 py-3">Score</th>
                  <th className="text-left font-semibold px-6 py-3">Created</th>
                  <th className="text-right font-semibold px-6 py-3">Report</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{s.id}</td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-bold',
                          s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          s.status === 'running' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          s.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          s.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                          'bg-gray-50 text-gray-700 border border-gray-100'
                        )}
                      >
                        {s.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-900">{s.total_score ?? '-'}</td>
                    <td className="px-6 py-3 text-gray-600">{formatDate(s.created_at)}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to={`/results/${s.id}`}
                        className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 font-semibold"
                      >
                        View <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!loading && filteredItems.length === 0) && (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500" colSpan={5}>
                      No submissions yet. Go to <Link to="/student" className="text-indigo-700 font-semibold">Practice Workspace</Link> and click Submit & Evaluate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
