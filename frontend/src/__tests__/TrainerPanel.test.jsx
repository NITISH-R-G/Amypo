import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, language }) => (
    <textarea data-testid={`code-editor-${language}`} value={value || ''} onChange={(e) => onChange && onChange(e.target.value)} />
  )
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

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
            testSpec: {}
          })
        });
      }
      if (url.includes('/api/trainer/analytics?questionId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            passRate: 75,
            avgScore: 80,
            totalSubmissions: 100,
            scoreHistogram: [10, 20, 30, 40],
            failedTests: [{ test: 'test1', count: 5 }]
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });
  });

  afterEach(() => {
    delete global.ResizeObserver;
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

  it('can switch tabs to Analytics', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Default question should be selected
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    // Switch to Analytics Tab
    const analyticsTab = screen.getByText(/Cohort Analytics/i);
    await user.click(analyticsTab);

    expect(await screen.findByText('Pass Rate')).toBeInTheDocument();
  });

  it('can toggle starter template editor', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const toggleBtn = await screen.findByText(/Starter Template \(index\.html\)/i);
    await user.click(toggleBtn);

    expect(await screen.findByTestId('code-editor-html')).toBeInTheDocument();
  });
});
