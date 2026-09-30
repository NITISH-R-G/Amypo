import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import { dispatchForTest } from '../components/ui/use-toast';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

// Mock CodeEditor since we don't need monaco logic
vi.mock('../components/workspace/CodeEditor', () => {
  return {
    __esModule: true,
    default: ({ code, onChange }) => (
      <textarea data-testid="code-editor" value={code} onChange={e => onChange(e.target.value)} />
    )
  };
});

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchForTest({ type: 'REMOVE_TOAST' });
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (url.includes('/api/questions/1/baseline')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, question_id: 1, version: 1, job_id: '123' })
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
            files: [{ name: 'index.html', content: '<div></div>', is_starter: true }],
            testSpec: { steps: [] }
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('adds and removes assertion steps', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Switch to Builder tab
    const builderBtn = screen.getByText(/Content Builder/i);
    await user.click(builderBtn);

    await waitFor(() => {
      expect(screen.getByText(/Visual Test Spec Builder/i)).toBeInTheDocument();
    });

    // Add Step
    await user.click(screen.getByRole('button', { name: /Add Step/i }));

    const assertionSelects = await screen.findAllByRole('combobox');
    expect(assertionSelects.length).toBeGreaterThan(0);

    const deleteBtns = screen.getAllByRole('button');
    const deleteBtn = deleteBtns.find(b => b.className.includes('text-red-500'));
    if(deleteBtn) {
      await user.click(deleteBtn);
    }
  });

  it('renders analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsBtn = screen.getByText(/Cohort Analytics/i);
    await user.click(analyticsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cohort Score Distribution/i)).toBeInTheDocument();
    });
  });

  it('generates baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderBtn = screen.getByText(/Content Builder/i);
    await user.click(builderBtn);

    const baselineBtn = await screen.findByRole('button', { name: /Generate Baseline/i });
    await user.click(baselineBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
    });
  });
});
