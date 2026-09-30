import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart-mock" />,
  Doughnut: () => <div data-testid="doughnut-chart-mock" />
}));

// Provide a mock for CodeEditor
vi.mock('../components/workspace/CodeEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <textarea data-testid="code-editor-mock" value={value} onChange={e => onChange && onChange(e.target.value)} />
  )
}));

// Ensure window.HTMLElement.prototype.scrollIntoView is mocked to prevent errors
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ question: { id: 2, title: 'New Question' } })
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
            files: [],
            testSpec: {}
          })
        });
      }
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
      return Promise.reject(new Error('not found: ' + url));
    });
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <TrainerPanel />
    </MemoryRouter>
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

  it('can create a new question', async () => {
    const user = userEvent.setup();
    renderComponent();

    const addTopBtn = await screen.findByText('Add Question');
    await user.click(addTopBtn);

    const titleInput = await screen.findByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question');

    const descInput = await screen.findByPlaceholderText('Short description…');
    await user.type(descInput, 'Desc');

    // Click the submit button inside the form
    const createBtn = (await screen.findAllByText('Add Question'))[1];
    await user.click(createBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('navigates to analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const analyticsTab = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    expect(await screen.findByText(/78.5/)).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart-mock')).toBeInTheDocument();
  });
});
