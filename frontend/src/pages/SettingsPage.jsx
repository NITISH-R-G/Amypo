import { useEffect, useState } from 'react';
import { Moon, Settings, Sun, User } from 'lucide-react';

export default function SettingsPage() {
  const [theme, setTheme] = useState(() => {
    try {
      const t = window.localStorage.getItem('amypo_theme');
      return t === 'dark' || t === 'light' ? t : 'light';
    } catch (_) {
      return 'light';
    }
  });

  const [userId, setUserId] = useState(() => {
    try {
      return window.localStorage.getItem('amypo_user_id') || '1';
    } catch (_) {
      return '1';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('amypo_user_id', String(userId || '1'));
    } catch (_) {}
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="text-emerald-600" /> Configurations
        </h1>
        <p className="text-sm text-gray-500 mt-1">Theme and demo account settings for this workspace.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Theme</label>
          <button
            type="button"
            onClick={() => {
              setTheme((t) => {
                const next = t === 'dark' ? 'light' : 'dark';
                try {
                  document.documentElement.dataset.theme = next;
                  window.localStorage.setItem('amypo_theme', next);
                  window.dispatchEvent(new CustomEvent('amypo-theme-change', { detail: { theme: next } }));
                } catch (_) {}
                return next;
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            This toggles the global theme without changing any functionality.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Demo User ID</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-sm font-mono"
                placeholder="1"
              />
            </div>
            <button
              type="button"
              onClick={() => setUserId('2')}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold"
              title="Set admin demo user"
            >
              Set Admin (2)
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Admin-only actions like replay evaluation use this ID (via `amypo_user_id`).
          </p>
        </div>

        <div className="text-sm text-gray-700">
          <div className="font-semibold text-gray-900 mb-2">Troubleshooting</div>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Backend health: <span className="font-mono">/health</span></li>
            <li>Artifacts served from: <span className="font-mono">/artifacts/&lt;runId&gt;/...</span></li>
            <li>Results polling endpoint: <span className="font-mono">/api/submissions/&lt;id&gt;/result</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

