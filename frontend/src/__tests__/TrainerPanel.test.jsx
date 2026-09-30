import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="code-editor-mock"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
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
      if (url.includes('/api/trainer/questions')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ question: { id: 2, title: 'New Question' }, baseline: { queued: true, version: 1 } })
          });
        }
        if (url.includes('/draft') && options && options.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, baseline: { queued: true, version: 1 } })
          });
        }
        if (url.includes('/draft')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [] },
              files: [],
              testSpec: {
                tests: [{ type: 'dom', target: '.card', assertion: 'exists' }],
                interactions: [{ action: 'click', selector: 'button' }]
              }
            })
          });
        }
        if (url.includes('/baseline')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, version: 1 })
          });
        }
      }
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, version: 1 })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1' }] })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    // Mock for smooth scrolling
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
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

    const questionButton = await screen.findByText('Question 1');
    expect(questionButton).toBeInTheDocument();

    // Wait for the draft to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('adds and removes a DOM test assertion', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const addAssertionBtn = screen.getByRole('button', { name: /Add Assertion/i });
    await user.click(addAssertionBtn);

    // Wait for new assertion to appear
    const selects = await screen.findAllByRole('combobox');

    const trashButtons = screen.getAllByRole('button').filter(b => b.className.includes('text-gray-300 hover:text-red-500'));
    if (trashButtons.length > 0) {
      await user.click(trashButtons[0]);
    }
  });

  it('creates a new question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addBtn = screen.getAllByRole('button', { name: /Add/i }).find(b => b.textContent.includes('Add Question'));
    if (addBtn) {
      await user.click(addBtn);
    }

    const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question');

    const createBtn = screen.getAllByRole('button', { name: /Add Question/i }).find(b => b.className.includes('w-full bg-emerald-600'));
    if (createBtn) {
      await user.click(createBtn);
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Question')
      }));
    });
  });

  it('generates a baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const generateBtn = screen.getByRole('button', { name: /Generate Baseline/i });
    await user.click(generateBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('renders analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const analyticsTab = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    expect(screen.getByText('Avg. Score')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
