import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface CohortData {
  bucket: string;
  averageScore: number;
}

const MOCK_COHORT_DATA: CohortData[] = [
  { bucket: 'HTML Validity', averageScore: 92 },
  { bucket: 'CSS Styling', averageScore: 78 },
  { bucket: 'JS Logic', averageScore: 65 },
  { bucket: 'Visual Regression', averageScore: 88 },
  { bucket: 'Code Quality', averageScore: 81 },
];

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-grayscale-200 w-full mb-8">
      <h2 className="text-xl font-bold text-black mb-1">Cohort Performance Analytics</h2>
      <p className="text-sm text-grayscale-500 mb-6">Aggregate evaluation scores across the latest assignment.</p>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={MOCK_COHORT_DATA}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="bucket" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 14 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar 
              dataKey="averageScore" 
              name="Average Score (%)" 
              fill="#24a86c" // Primary Emerald Green
              radius={[4, 4, 0, 0]} 
              barSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
