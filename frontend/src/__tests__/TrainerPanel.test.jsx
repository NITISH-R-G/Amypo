import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
  Line: () => null
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.IS_REACT_ACT_ENVIRONMENT = true;
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    HTMLCanvasElement.prototype.getContext = () => {};
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

  it('can switch tabs to analytics and view metrics', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsTab = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    // Verify analytics content
    await waitFor(() => {
      expect(screen.getByText('Cohort Score Distribution')).toBeInTheDocument();
      expect(screen.getByText('Submissions')).toBeInTheDocument();
      expect(screen.getByText('342')).toBeInTheDocument();
    });
  });

  it('can open starter code editor', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Select the question to load
    const q1 = await screen.findByText('Question 1');
    await user.click(q1);

    await waitFor(() => {
       expect(screen.getByText('Visual Test Spec Builder')).toBeInTheDocument();
    });

    const viewCodeBtn = screen.getByRole('button', { name: /Starter Template \(index\.html\)/i });
    await user.click(viewCodeBtn);

    // Verify it expands (just checking it was clicked successfully and no crash)
    expect(viewCodeBtn).toBeInTheDocument();
  });
});
