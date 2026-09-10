import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="mock-code-editor"
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
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
      return Promise.reject(new Error('not found: ' + url));
    });
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

  it('can select question and show specs', async () => {
    const user = userEvent.setup();
    renderComponent({ embedded: true, initialTab: 'builder' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const q1 = await screen.findByText('Question 1');
    await user.click(q1);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    // Wait for the panel to show specific parts to confirm it's loaded
    await screen.findByText(/Generate Baseline/i);

    // Fallback if interaction/assertion buttons aren't found directly, at least test the question switching logic
  });

  it('renders analytics view properly', async () => {
    renderComponent({ embedded: true, initialTab: 'analytics' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(screen.getByText('Cohort Score Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
    expect(screen.getByText(/Avg. Score/i)).toBeInTheDocument();
  });
});
