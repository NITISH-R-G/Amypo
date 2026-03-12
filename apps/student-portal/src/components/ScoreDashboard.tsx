import React from 'react';

interface ScoreBucket {
  name: string;
  score: number; // 0 to 100
  weight: number; // 0 to 1
}

interface ScoreDashboardProps {
  buckets: ScoreBucket[];
}

export const ScoreDashboard: React.FC<ScoreDashboardProps> = ({ buckets }) => {
  const overallScore = buckets.reduce((acc, curr) => acc + (curr.score * curr.weight), 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-grayscale-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-black">Evaluation Score</h2>
        <div className="text-3xl font-black text-primary">
          {Math.round(overallScore)}<span className="text-lg text-grayscale-400">/100</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {buckets.map((bucket) => (
          <div key={bucket.name}>
            <div className="flex justify-between text-sm font-medium mb-1 text-grayscale-700">
              <span>{bucket.name} <span className="text-grayscale-400 text-xs ml-1">({bucket.weight * 100}%)</span></span>
              <span>{Math.round(bucket.score)}</span>
            </div>
            <div className="w-full bg-grayscale-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${bucket.score}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
