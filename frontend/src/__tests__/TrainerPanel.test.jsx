import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="code-editor" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  )
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('creates a new question', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementationOnce((url) => {
        if (url.includes('/api/questions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [] })
          });
        }
    }).mockImplementationOnce((url, options) => {
        if (url.includes('/api/trainer/questions') && options.method === 'POST') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ question: { id: 2, title: 'New Question' }, baseline: { queued: true, version: 1 } })
            });
        }
    }).mockImplementationOnce((url) => {
        if (url.includes('/api/questions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [{ id: 2, title: 'New Question' }] })
          });
        }
    }).mockImplementationOnce((url) => {
        if (url.includes('/api/trainer/questions/2/draft')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                question: { id: 2, title: 'New Question', description: '', allowed_libraries: [] },
                files: [],
                testSpec: {}
              })
            });
        }
    });

    renderComponent();

    const addModuleButton = await screen.findByRole('button', { name: /Add Question/i });
    await user.click(addModuleButton);

    const titleInput = await screen.findByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question');

    const createButtons = await screen.findAllByRole('button', { name: /Add Question/i });
    await user.click(createButtons[createButtons.length - 1]);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ title: 'New Question', description: '' })
        }));
    });
  });

  it('generates baseline for selected question', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementationOnce((url) => {
        if (url.includes('/api/questions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1' }] })
          });
        }
    }).mockImplementationOnce((url) => {
        if (url.includes('/api/trainer/questions/1/draft')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [] },
                files: [],
                testSpec: {}
              })
            });
        }
    }).mockImplementationOnce((url, options) => {
        if (url.includes('/api/questions/1/baseline') && options.method === 'POST') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ question_id: 1, version: 1, job_id: 'job-123' })
            });
        }
    });

    renderComponent({ initialTab: 'builder' });

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    const generateBaselineButton = screen.getByRole('button', { name: /Generate Baseline/i });
    await user.click(generateBaselineButton);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
            method: 'POST'
        }));
    });
  });

  it('renders analytics tab', async () => {
    global.fetch.mockImplementationOnce((url) => {
        if (url.includes('/api/questions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1' }] })
          });
        }
    }).mockImplementationOnce((url) => {
        if (url.includes('/api/trainer/questions/1/draft')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [] },
                files: [],
                testSpec: {}
              })
            });
        }
    });

    renderComponent({ initialTab: 'analytics' });

    await waitFor(() => {
      expect(screen.getByText('Cohort Score Distribution')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});
