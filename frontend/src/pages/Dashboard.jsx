import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileVideo, TerminalSquare } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="w-full flex-1 flex flex-col gap-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Jump back into practice, review submissions, or check analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/student"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <TerminalSquare size={22} />
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" size={20} />
          </div>
          <h2 className="mt-4 font-bold text-gray-900">Practice Workspace</h2>
          <p className="text-sm text-gray-500 mt-1">Write code and run evaluations.</p>
        </Link>

        <Link
          to="/submissions"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileVideo size={22} />
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" size={20} />
          </div>
          <h2 className="mt-4 font-bold text-gray-900">My Submissions</h2>
          <p className="text-sm text-gray-500 mt-1">Track status, score, and reports.</p>
        </Link>

        <Link
          to="/analytics"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BarChart3 size={22} />
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" size={20} />
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

