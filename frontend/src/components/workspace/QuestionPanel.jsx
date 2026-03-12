import React from 'react';
import { cn } from '../../utils/utils';

export default function QuestionPanel({ question, variant = 'default', className }) {
  if (!question) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Loading question...
      </div>
    );
  }

  const isWorkspace = variant === 'workspace';

  return (
    <div
      className={cn(
        'question-panel w-full h-full overflow-y-auto px-6 py-7',
        isWorkspace ? 'bg-transparent' : 'bg-white',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="px-2.5 py-1 font-semibold text-xs rounded-md shadow-sm border bg-emerald-100 text-emerald-700 border-emerald-200/40">
          {question.difficulty || 'Easy'}
        </span>
        <h1 className={cn('tracking-tight text-gray-900', isWorkspace ? 'text-xl font-black' : 'text-2xl font-bold')}>
          {question.title}
        </h1>
      </div>

      <div className="max-w-none text-sm leading-relaxed text-gray-700">
        <div dangerouslySetInnerHTML={{ __html: question.description }} />
      </div>

      {question.requirements && question.requirements.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 pb-2 border-b text-gray-900 border-gray-100">
            Technical Requirements
          </h3>
          <ul className="space-y-3">
            {question.requirements.map((req, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-gray-700">
                <span
                  className={cn(
                    'mt-2 h-1.5 w-1.5 rounded-full shrink-0',
                    isWorkspace ? 'bg-emerald-500' : 'bg-indigo-500'
                  )}
                  aria-hidden="true"
                />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

