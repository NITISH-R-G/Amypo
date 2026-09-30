import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import { dispatchForTest } from '../components/ui/use-toast';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="code-editor" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  )
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchForTest({ type: 'REMOVE_TOAST' });
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'queued', question_id: 1, version: 1 })
        });
      }
      if (url.includes('/api/trainer/questions')) {
        if (options && options.method === 'POST') {
           return Promise.resolve({
             ok: true,
             json: () => Promise.resolve({ question: { id: 2, title: 'New Question' } })
           });
        }
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1' }] })
        });
      }
      if (url.includes('/api/trainer/questions/1/draft')) {
        if (options && options.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, baseline: { queued: true, version: 1 } })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [] },
            files: [{ name: 'index.html', content: 'hello' }],
            testSpec: { type: 'dom', cases: [] },
            interactions: []
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
  });

  const renderComponent = (props = {}) => render(
    <BrowserRouter>
      <TrainerPanel {...props} />
    </BrowserRouter>
  );

  it('renders trainer panel, fetches questions, and saves draft', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('handles embedded mode and analytics tab', async () => {
     renderComponent({ embedded: true, initialTab: 'analytics' });
     expect(await screen.findByText('Avg. Score')).toBeInTheDocument();
     expect(screen.getByText('78.5')).toBeInTheDocument(); // default state from file
  });

  it('generates baseline', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => expect(screen.queryByText('Question 1')).toBeInTheDocument());

     const generateBtn = screen.getByRole('button', { name: /Generate Baseline/i });
     await user.click(generateBtn);

     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({ method: 'POST' }));
     });
  });

  it('adds and removes a dom test and interaction step', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => expect(screen.queryByText('Question 1')).toBeInTheDocument());

     const addTestBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Add Assertion'));
     await user.click(addTestBtn);

     const trashBtns = screen.getAllByRole('button', { name: '' }).filter(b => b.innerHTML.includes('lucide-trash2'));
     expect(trashBtns.length).toBeGreaterThan(0);

     await user.click(trashBtns[0]);

     // add an interaction step
     const addInteractionBtn = screen.getByRole('button', { name: /Add Step/i });
     await user.click(addInteractionBtn);
  });

  it('creates a new question', async () => {
     const user = userEvent.setup();
     renderComponent();

     // The button might have text "Add Question"
     const addQuestionBtns = screen.getAllByRole('button').filter(b => b.textContent.includes('Add Question'));
     await user.click(addQuestionBtns[0]); // to open the menu

     const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
     await user.type(titleInput, 'New Question');

     // Click the second Add Question button to submit
     const addQuestionSubmit = screen.getAllByRole('button').filter(b => b.textContent.includes('Add Question'));
     await user.click(addQuestionSubmit[addQuestionSubmit.length - 1]);

     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({ method: 'POST' }));
     });
  });
});