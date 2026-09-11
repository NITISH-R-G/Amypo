import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Toaster } from '../components/ui/use-toast';

// Mock ResizeObserver for Chart.js
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function() {};

// Mock CodeEditor since Monaco can be complex to test in JSDOM
vi.mock('../components/workspace/CodeEditor', () => ({
  __esModule: true,
  default: ({ value, onChange, testId }) => (
    <textarea
      data-testid={testId || 'mock-code-editor'}
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  )
}));

describe('TrainerPanel', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/api/questions') && !url.includes('draft') && !url.includes('baseline')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        questions: [
                            {
                                id: 1,
                                title: 'Sample CSS Question',
                                difficulty: 'Beginner',
                                status: 'draft'
                            }
                        ]
                    })
                })
            }
            if (url.includes('/api/trainer/questions/1/draft')) {
                 return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        question: {
                            id: 1,
                            title: 'Sample CSS Question',
                            status: 'draft'
                        },
                        files: [],
                        testSpec: null
                    })
                 })
            }
             if (url.includes('/api/trainer/questions') && !url.includes('draft')) {
                 return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        question: {
                            id: 2,
                            title: 'New Question Title',
                            status: 'draft'
                        }
                    })
                 })
            }
            return Promise.reject(new Error('Unknown URL: ' + url));
        });

    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

  it('renders trainer panel, fetches questions, and saves draft', async () => {
      render(<><TrainerPanel /><Toaster/></>);

      // Wait for questions to load
      await waitFor(() => {
         expect(screen.getByText('Sample CSS Question')).toBeInTheDocument();
      });

      // Switch to create mode by clicking on 'Add'
      const addButtons = screen.getAllByText(/Add/i, { selector: 'button' });
      // The first one should be Add Question
      await act(async () => {
          fireEvent.click(addButtons[0]);
      });

      const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'New Question Title');

      // Update description
      const descriptionInput = screen.getByPlaceholderText('Short description…');
      await userEvent.clear(descriptionInput);
      await userEvent.type(descriptionInput, 'This is a new question description');


      // Click Add Question
      const addQuestionButtons = screen.getAllByText('Add Question');
      await act(async () => {
          fireEvent.click(addQuestionButtons[0]);
      });


      // Update config title
      const configTitleInput = screen.getByPlaceholderText('Responsive Profile Card');
      await userEvent.clear(configTitleInput);
      await userEvent.type(configTitleInput, 'Config Title');

      // Save draft
      await act(async () => {
         fireEvent.click(screen.getByText('Save Draft'));
      });

      await waitFor(() => {
          expect(screen.getByText('Draft Saved')).toBeInTheDocument();
      })

  });

  it('handles error when fetching questions', async () => {
       global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
       render(<><TrainerPanel /><Toaster/></>);

       await waitFor(() => {
           expect(screen.getByText('Load Failed')).toBeInTheDocument();
       });
  });

  it('switches between configuration tabs', async () => {
      render(<><TrainerPanel /><Toaster/></>);
      // Wait for questions to load
      await waitFor(() => {
         expect(screen.getByText('Sample CSS Question')).toBeInTheDocument();
      });

      expect(screen.getByText('Visual Test Spec Builder')).toBeInTheDocument();
  });

});
