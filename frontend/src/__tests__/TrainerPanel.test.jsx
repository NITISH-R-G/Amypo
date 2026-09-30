import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, label }) => (
    <textarea data-testid={`code-editor-${label}`} value={value} onChange={(e) => onChange(e.target.value)} />
  )
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
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
            files: [],
            testSpec: { type: 'ui' }
          })
        });
      }
      if (url.includes('/api/submissions?question_id=')) {
        return Promise.resolve({
           ok: true,
           json: () => Promise.resolve([{ id: 1, total_score: 95 }])
        })
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
  });

  const renderComponent = (props) => render(
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

  it('handles editing question title and description', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/questions');
     });
     expect(await screen.findByDisplayValue('Question 1')).toBeInTheDocument();

     const titleInput = screen.getByDisplayValue('Question 1');
     await user.clear(titleInput);
     await user.type(titleInput, 'New Title');

     expect(titleInput.value).toBe('New Title');
  });

  it('handles evaluating baseline', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const evalButton = screen.getByRole('button', { name: /Generate Baseline/i });
    await user.click(evalButton);

    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.anything());
    });
  });

  it('switches to analytics tab and renders charts', async () => {
     const user = userEvent.setup();
     renderComponent({ initialTab: 'analytics' });
     await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/questions');
     });

     expect(await screen.findByTestId('bar-chart')).toBeInTheDocument();
  });
});
