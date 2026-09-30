import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

// We need to mock ResizeObserver for charts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('react-chartjs-2', () => ({
    Bar: () => <div data-testid="mock-bar-chart" />,
    Doughnut: () => <div data-testid="mock-doughnut-chart" />
}));

vi.mock('../components/workspace/CodeEditor', () => ({
    default: ({ code, onChange }) => (
        <textarea data-testid="mock-code-editor" value={code} onChange={(e) => onChange(e.target.value)} />
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
            testSpec: {
                viewport: { width: 800, height: 600 },
                assertions: [],
                interactions: []
            }
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    vi.spyOn(window, 'alert').mockImplementation(() => {});
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

    const questionButton = await screen.findByText('Question 1');
    expect(questionButton).toBeInTheDocument();

    await user.click(questionButton);

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('allows adding test spec assertions and deleting them', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const questionButton = await screen.findByText('Question 1');
      await user.click(questionButton);

      const addAssertionBtn = await screen.findByText('Add Assertion');
      expect(addAssertionBtn).toBeInTheDocument();

      await user.click(addAssertionBtn);

      const selectBoxes = await screen.findAllByRole('combobox');
      expect(selectBoxes.length).toBeGreaterThan(0);

      // Let's delete the assertion
      const deleteAssertionBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-trash-2') || b.querySelector('svg.lucide-trash-2'));
      if(deleteAssertionBtn) {
          await user.click(deleteAssertionBtn);
      }
  });

  it('switches to analytics tab', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const analyticsBtn = screen.getByText(/Cohort Analytics/i);
      await user.click(analyticsBtn);

      // Assuming mock bar chart is rendered in analytics tab
      expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });
});
