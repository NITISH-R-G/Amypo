import React, { useState } from 'react';
import { Settings, BarChart2, Plus, GripVertical, Trash2, Code2, Users, FileSignature, Box } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import CodeEditor from '../components/workspace/CodeEditor';
import { cn } from '../utils/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function TrainerPanel() {
  const [activeTab, setActiveTab] = useState('builder');
  
  // Mock Builder State
  const [tests, setTests] = useState([
    { id: 1, type: 'dom', target: '.profile-card', assertion: 'exists', weight: 10 },
    { id: 2, type: 'css', target: '.profile-card', property: 'display', value: 'flex', weight: 20 },
  ]);

  // Mock Analytics Data
  const analyticsData = {
    avgScore: 78.5,
    avgExecution: '1.2s',
    totalSubmissions: 342,
    passRate: '64%',
    scoreHistogram: [12, 25, 68, 142, 95],
    failedTests: [
      { test: '.profile-card display:flex', count: 124 },
      { test: 'button:hover background-color', count: 89 },
      { test: '.avatar border-radius', count: 45 }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 pb-12">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trainer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage assessment questions, test specs, and analyze cohort performance.</p>
        </div>
        
        <div className="flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60">
          <button 
            onClick={() => setActiveTab('builder')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'builder' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Settings size={16} /> Content Builder
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              activeTab === 'analytics' ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <BarChart2 size={16} /> Cohort Analytics
          </button>
        </div>
      </div>

      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           
           {/* Question Metadata config */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
             <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <FileSignature size={18} className="text-indigo-600" />
                <h2 className="font-bold text-gray-900">Question Definition</h2>
             </div>
             <div className="p-6 space-y-5">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Title</label>
                 <input type="text" defaultValue="Responsive Profile Card" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all" />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Markdown Description</label>
                 <textarea rows="4" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none" defaultValue="Build a profile card matching the design specs..."></textarea>
               </div>
               
               <div className="border border-gray-200 rounded-xl overflow-hidden h-[300px] flex flex-col">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-slate-200 text-sm font-medium">
                     <span className="flex items-center gap-2"><Code2 size={14}/> Starter Template (index.html)</span>
                  </div>
                  <div className="flex-1 bg-slate-900 relative">
                     <CodeEditor language="html" value="<div class='card'>\n  <!-- Start styling here -->\n</div>" onChange={()=>{}} />
                  </div>
               </div>
               
               <div className="flex justify-end pt-2">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition-colors">
                    Save Draft
                  </button>
               </div>
             </div>
           </div>

           {/* Visual Test Builder */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
             <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Box size={18} className="text-emerald-600" />
                  <h2 className="font-bold text-gray-900">Visual Test Spec Builder</h2>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                  <Plus size={14} /> Add Assertion
                </button>
             </div>
             
             <div className="p-6 bg-gray-50 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {tests.map((test, i) => (
                    <div key={test.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-4 group">
                       <GripVertical size={20} className="text-gray-300 mt-2 cursor-grab active:cursor-grabbing hover:text-gray-500" />
                       <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Assertion Type</label>
                            <select className="w-full text-sm border-gray-200 rounded-md bg-gray-50 focus:bg-white" defaultValue={test.type}>
                               <option value="dom">DOM Structure</option>
                               <option value="css">Computed CSS</option>
                               <option value="interaction">Interaction Payload</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Target Selector</label>
                            <input type="text" className="w-full text-sm border-gray-200 rounded-md font-mono text-indigo-600" defaultValue={test.target} />
                          </div>
                          {test.type === 'css' && (
                            <>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">CSS Property</label>
                                <input type="text" className="w-full text-sm border-gray-200 rounded-md font-mono" defaultValue={test.property} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Expected Value</label>
                                <input type="text" className="w-full text-sm border-gray-200 rounded-md font-mono" defaultValue={test.value} />
                              </div>
                            </>
                          )}
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Rubric Weight</label>
                            <input type="number" className="w-full text-sm border-gray-200 rounded-md" defaultValue={test.weight} />
                          </div>
                       </div>
                       <button className="text-gray-300 hover:text-red-500 transition-colors mt-8">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  ))}
                  
                  {/* Generated JSON Preview */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Generated Spec JSON Output</h3>
                    <div className="bg-slate-900 rounded-xl p-4 overflow-auto">
                      <pre className="text-xs text-indigo-300 font-mono">
{`{
  "version": "1.0",
  "rules": [
    {
      "type": "dom",
      "target": ".profile-card",
      "assertion": "exists",
      "weight": 10
    },
    {
      "type": "css",
      "target": ".profile-card",
      "property": "display",
      "value": "flex",
      "weight": 20
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>

                </div>
             </div>
           </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
           {/* Metric Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Avg. Score</span>
                <span className="text-4xl font-black text-indigo-600">{analyticsData.avgScore}<span className="text-xl text-indigo-300 ml-1">%</span></span>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Pass Rate</span>
                <span className="text-4xl font-black text-emerald-500">{analyticsData.passRate}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Submissions</span>
                <span className="text-4xl font-black text-gray-800">{analyticsData.totalSubmissions}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <span className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-2">Avg Performance</span>
                <span className="text-4xl font-black text-purple-600">{analyticsData.avgExecution}</span>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* Score Distribution Chart */}
             <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6">Cohort Score Distribution</h3>
                <div className="h-[300px] flex items-center justify-center">
                  <Bar 
                    data={{
                      labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
                      datasets: [{
                        label: 'Students',
                        data: analyticsData.scoreHistogram,
                        backgroundColor: '#6366f1',
                        borderRadius: 6,
                        borderSkipped: false,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { dash: [4,4] } },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                </div>
             </div>

             {/* Diagnostics List */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600"/> Common Stumbling Blocks
                </h3>
                <div className="flex-1 overflow-y-auto pr-2">
                  <ul className="space-y-3">
                    {analyticsData.failedTests.map((item, idx) => (
                      <li key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-red-600 bg-red-50/50 px-2 py-1 rounded border border-red-100 tracking-tight truncate flex-1">
                          {item.test}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-bold text-gray-700">{item.count}</span>
                          <span className="text-xs text-gray-400">fails</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
             </div>

           </div>
        </div>
      )}
    </div>
  );
}
