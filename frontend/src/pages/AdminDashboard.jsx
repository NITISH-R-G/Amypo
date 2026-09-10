import { useState, useEffect } from 'react';
import { Shield, Server, Activity, Users, FileCode, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({ users: 0, submissions: 0 });
  const [health, setHealth] = useState({ status: 'unknown' });
  const [whitelist, setWhitelist] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      try {
        const uRes = await fetch('/api/admin/users');
        const uData = await uRes.json().catch(() => ([]));
        const sRes = await fetch('/api/submissions');
        const sData = await sRes.json().catch(() => ([]));
        if(mounted){
            setMetrics({
              users: Array.isArray(uData) ? uData.length : 0,
              submissions: Array.isArray(sData) ? sData.length : 0
            });
        }
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      }
    };
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (mounted) {
            if (res.ok) setHealth({ status: 'healthy' });
            else setHealth({ status: 'unhealthy' });
        }
      } catch (err) {
        if(mounted) setHealth({ status: 'offline' });
        console.error('Failed to fetch health', err);
      }
    };

    // Abstracting fetch whitelist and logs to separate methods
    const fetchWhitelist = async () => {
      try {
        const res = await fetch('/api/admin/settings/whitelist');
        const data = await res.json().catch(() => ({}));
        if (mounted && res.ok && Array.isArray(data.domains)) {
          setWhitelist(data.domains);
        }
      } catch (err) {
        console.error('Failed to fetch whitelist', err);
      }
    };

    fetchMetrics();
    fetchHealth();
    fetchWhitelist();
    
    return () => {
        mounted = false;
    };
  }, []);

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    try {
      const res = await fetch('/api/admin/settings/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || 'Failed to add domain');

      setWhitelist(prev => [...prev, newDomain.trim()]);
      setNewDomain('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveDomain = async (domainToRemove) => {
    try {
      const res = await fetch(`/api/admin/settings/whitelist/${encodeURIComponent(domainToRemove)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to remove domain');

      setWhitelist(prev => prev.filter(d => d !== domainToRemove));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Administration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage instance configuration and monitor health.</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
          <Activity size={18} className={health.status === 'healthy' ? 'text-emerald-500' : 'text-rose-500'} />
          <span className="font-semibold text-gray-700 capitalize text-sm">{health.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Users</p>
            <p className="text-2xl font-black text-gray-900">{metrics.users}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <FileCode size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Submissions</p>
            <p className="text-2xl font-black text-gray-900">{metrics.submissions}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Worker Status</p>
            <p className="text-xl font-bold text-gray-900">Available</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Server size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Database</p>
            <p className="text-xl font-bold text-gray-900">Connected</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
            <Shield size={18} className="text-emerald-600" />
            <h2 className="font-bold text-gray-900">Email Whitelist</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-6">
              Only users signing in from these email domains will be authorized as 'Teacher' or 'Admin' roles.
            </p>

            <form onSubmit={handleAddDomain} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g., example.edu"
                className="flex-1 border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newDomain.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Add Domain
              </button>
            </form>

            {error && (
              <div className="mb-6 flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-lg text-sm font-medium">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              {whitelist.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No domains currently whitelisted.
                </div>
              ) : (
                whitelist.map((domain) => (
                  <div key={domain} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                    <span className="font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-md text-sm">{domain}</span>
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      className="text-xs font-semibold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 px-3 py-1.5 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col opacity-50 pointer-events-none">
           <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
             <Server size={18} className="text-gray-600" />
             <h2 className="font-bold text-gray-900">System Logs</h2>
           </div>
           <div className="flex-1 p-6 flex items-center justify-center bg-gray-50 min-h-[300px]">
              <p className="font-medium text-gray-500">Log viewing module not configured in this environment.</p>
           </div>
        </section>
      </div>
    </div>
  );
}
