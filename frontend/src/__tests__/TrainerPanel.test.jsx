import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Mock Bar Chart</div>,
  Doughnut: () => <div data-testid="mock-doughnut-chart">Mock Doughnut Chart</div>,
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="mock-code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  )
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question_id: 1, version: 1, job_id: 'job-123' })
        });
      }
      if (url.includes('/api/trainer/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question: { id: 2, title: 'New Question' }, baseline: { queued: true, version: 1 } })
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

  it('can switch tabs to analytics and back', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsTab = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    expect(screen.getByText('Cohort Score Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();

    const builderTab = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);
    expect(screen.getByText('Questions')).toBeInTheDocument();
  });

  it('generates a baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const generateBaselineButton = await screen.findByRole('button', { name: /Generate Baseline/i });
    await user.click(generateBaselineButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('creates a new question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addQuestionToggle = await screen.findByText('Add Question');
    await user.click(addQuestionToggle);

    const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question');

    const descInput = screen.getByPlaceholderText('Short description…');
    await user.type(descInput, 'Desc');

    const addButtons = screen.getAllByRole('button', { name: 'Add Question' });
    await user.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New Question', description: 'Desc' })
      }));
    });
  });

  it('manages assertions in Visual Test Spec Builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addAssertionButton = await screen.findByRole('button', { name: /Add Assertion/i });
    await user.click(addAssertionButton);

    // Default is DOM, exists. Let's find the selects.
    // It's tricky with multiple selects, so we find the newly added assertion block by index.
    const selects = screen.getAllByRole('combobox');
    // We expect there are existing assertions from the mock draft, so let's just change the last one.
    expect(selects.length).toBeGreaterThan(0);

    // Add Interaction step
    const addInteractionButton = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addInteractionButton);

    const interactionSelects = screen.getAllByRole('combobox');
    expect(interactionSelects.length).toBeGreaterThan(selects.length);

  });
});
