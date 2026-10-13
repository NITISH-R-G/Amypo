import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, language }) => (
    <textarea
      data-testid={`mock-editor-${language}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Baseline queued' })
        })
      }
      if (url.includes('/api/questions')) {
        if (options && options.method === 'POST') {
             return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, question: { id: 2, title: 'New Question' } })
            });
        }
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
            testSpec: { type: 'ui', interactions: [{ id: 'i1', action: 'click', selector: 'btn' }] }
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <TrainerPanel />
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

  it('handles question selection and loads draft details', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const questionItem = await screen.findByText('Question 1');
      await userEvent.click(questionItem);

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
      });

      await waitFor(() => {
         expect(screen.getByDisplayValue('Question 1')).toBeInTheDocument();
      });
  });

  it('generates baseline for selected question', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const questionItem = await screen.findByText('Question 1');
      await userEvent.click(questionItem);

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
      });

      const baselineBtn = await screen.findByRole('button', { name: /Generate Baseline/i });
      await userEvent.click(baselineBtn);

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({ method: 'POST' }));
      });
  });
});
