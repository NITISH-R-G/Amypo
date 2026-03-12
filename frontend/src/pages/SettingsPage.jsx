import { useState } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [apiBase, setApiBase] = useState('http://localhost:4000');

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="text-indigo-600" /> Configurations
        </h1>
        <p className="text-sm text-gray-500 mt-1">Basic environment settings for this demo.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Base URL</label>
          <input
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-2">
            This page is informational for now. Most pages currently use `http://localhost:4000` directly.
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

