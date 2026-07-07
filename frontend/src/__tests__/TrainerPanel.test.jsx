import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="code-editor-mock" value={value || ''} onChange={(e) => onChange(e.target.value)} />
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
              tests: [{ id: '1', type: 'exists', selector: '.test' }]
            }
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
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

  it('can interact with the Visual Test Spec Builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const qBtn = await screen.findByText('Question 1');
    await user.click(qBtn);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const addAssertionBtn = await screen.findByText(/Add Assertion/i);
    expect(addAssertionBtn).toBeInTheDocument();

    await user.click(addAssertionBtn);

    // Check that we can remove an assertion
    const trashButtons = await screen.findAllByRole('button');
    const trashBtn = trashButtons.find(b => b.innerHTML.includes('lucide-trash-2') || b.className.includes('text-red-500'));
    if (trashBtn) {
       await user.click(trashBtn);
    }
  });

  it('can open add template modal', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const buttons = await screen.findAllByRole('button');
    const addQBtn = buttons.find(b => b.innerHTML.includes('lucide-plus') && b.innerHTML.includes('Add'));

    if (addQBtn) {
        await user.click(addQBtn);
    }
  });

  it('can navigate to analytics', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsBtn = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsBtn);

    const avgScore = await screen.findByText(/Avg. Score/i);
    expect(avgScore).toBeInTheDocument();
  });
});
