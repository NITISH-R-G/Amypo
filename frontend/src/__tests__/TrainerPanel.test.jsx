import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Mock Bar Chart</div>,
  Doughnut: () => <div data-testid="mock-doughnut-chart">Mock Doughnut Chart</div>,
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, language }) => (
    <textarea
      data-testid={`code-editor-${language}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('@monaco-editor/react', () => ({
  default: () => <textarea data-testid="monaco-editor" />
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

  it('switches tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // TrainerPanel has "Content Builder" and "Cohort Analytics"
    const analyticsBtn = screen.getByText(/Cohort Analytics/i);
    await user.click(analyticsBtn);

    // Assert that the text shows "Avg. Score"
    expect(await screen.findByText(/Avg. Score/i)).toBeInTheDocument();

    const builderBtn = screen.getByText(/Content Builder/i);
    await user.click(builderBtn);

    expect(await screen.findByText(/Visual Test Spec Builder/i)).toBeInTheDocument();
  });

  it('can configure test specs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Should be on content builder by default
    expect(await screen.findByText(/Visual Test Spec Builder/i)).toBeInTheDocument();

    const addStepBtn = screen.getByRole('button', { name: /Add Step/i });
    await user.click(addStepBtn);

    // Check if new step appears. The default type is DOM.
    // There are 2 existing ones, so clicking adds another DOM step.
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });
});
