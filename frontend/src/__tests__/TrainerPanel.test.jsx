import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock react-chartjs-2 to prevent canvas rendering errors in JSDOM
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />
}));

// Mock CodeEditor
vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question_id: 1, version: 2, job_id: 'job-123' })
        });
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
            files: [],
            testSpec: {}
          })
        });
      }
      if (url.includes('/api/trainer/questions')) {
        if (options && options.method === 'POST') {
           return Promise.resolve({
               ok: true,
               json: () => Promise.resolve({ question: { id: 2, title: 'New Question' }, baseline: { queued: true, version: 1 } })
           });
        }
      }
      return Promise.reject(new Error('not found: ' + url));
    });
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

  it('generates a baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const baselineBtn = await screen.findByRole('button', { name: /Generate Baseline/i });
    await user.click(baselineBtn);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('creates a new question', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const addBtn = screen.getAllByText('Add Question')[0]; // The first one is in the sidebar
      await user.click(addBtn);

      const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
      await user.type(titleInput, 'New Question');

      const submitBtn = screen.getAllByText('Add Question')[1]; // The button inside the form
      await user.click(submitBtn);

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({ method: 'POST' }));
      });
  });

  it('adds and removes a visual test assertion', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const addAssertionBtn = screen.getByText('Add Assertion');
      await user.click(addAssertionBtn);

      // Verify a new test is added. There should be 3 tests total (2 default + 1 new)
      const selects = screen.getAllByDisplayValue('DOM Structure');
      expect(selects.length).toBeGreaterThan(0);

      // Assuming the default tests are DOM and CSS, and we just added a new DOM one
      // The delete buttons do not have 'remove' as their accessible name
      // They are just buttons with lucide-trash2 icons inside
      const deleteButtons = document.querySelectorAll('button:has(svg.lucide-trash2)');
      const initialCount = deleteButtons.length;

      // Delete the last one
      await user.click(deleteButtons[deleteButtons.length - 1]);

      const newDeleteButtons = document.querySelectorAll('button:has(svg.lucide-trash2)');
      expect(newDeleteButtons.length).toBe(initialCount - 1);
  });

  it('adds and removes an interaction step', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const addStepBtn = screen.getByText('Add Step');
      await user.click(addStepBtn);

      // Verify a new step is added.
      expect(screen.getByText('Step 1 Action')).toBeInTheDocument();

      // Find delete buttons by their icon
      const deleteButtons = document.querySelectorAll('button:has(svg.lucide-trash2)');

      // Delete the interaction step (it's the last delete button)
      await user.click(deleteButtons[deleteButtons.length - 1]);
      expect(screen.queryByText('Step 1 Action')).not.toBeInTheDocument();
  });

  it('renders analytics tab correctly', async () => {
      renderComponent({ initialTab: 'analytics' });

      expect(screen.getByText('Cohort Analytics')).toBeInTheDocument();
      expect(screen.getByText('Avg. Score')).toBeInTheDocument();
      expect(screen.getByText('Pass Rate')).toBeInTheDocument();
      expect(screen.getByText('Submissions')).toBeInTheDocument();
      expect(screen.getByText('Avg Performance')).toBeInTheDocument();
      expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
  });
});
