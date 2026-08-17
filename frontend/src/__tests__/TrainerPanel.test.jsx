import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

import { useToast } from '../components/ui/use-toast';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
  Line: () => null
}));

vi.mock('../components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: []
  }))
}));

describe('TrainerPanel', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn();
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
    window.confirm = originalConfirm;
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

  it('switches tabs', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/trainer/questions/1/draft')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question: { id: 1, title: 'Q1' }, files: [] })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    // Default is builder
    await screen.findByText('Q1');
    expect(screen.getByRole('button', { name: /Content Builder/i })).toHaveClass('bg-white');

    const analyticsBtn = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsBtn);

    // Tab changes to analytics view
    await screen.findByText('Cohort Score Distribution');
  });

  it('handles load error', async () => {
    const { useToast } = await import('../components/ui/use-toast');
    const mockToast = vi.fn();
    useToast.mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] });

    global.fetch.mockImplementation(() => Promise.reject(new Error('Network error')));
    renderComponent();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Load Failed',
        variant: 'destructive'
      }));
    });
  });

  it('handles generating baseline', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/trainer/questions/1/draft')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 1, title: 'Q1' },
            files: [],
            testSpec: {}
          })
        });
      }
      if (url.includes('/api/questions/1/baseline') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queued: true, job_id: '123' })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    // Select question
    await screen.findByText('Q1');

    const generateBtn = screen.getByRole('button', { name: /Generate Baseline/i });
    await user.click(generateBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/questions/1/baseline',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('handles creating new question', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, options) => {
      if (url === '/api/questions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/trainer/questions/1/draft')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 1, title: 'Q1' },
            files: [],
            testSpec: {}
          })
        });
      }
      if (url === '/api/trainer/questions' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question: { id: 2, title: 'New Q' }, baseline: { queued: true } })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    renderComponent();

    await screen.findByText('Q1');

    const toggleAddBtn = screen.getByRole('button', { name: /Add Question/i });
    await user.click(toggleAddBtn);

    const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Q');

    // Due to the DOM having many buttons, query by className or structure.
    const addBtn = screen.getAllByRole('button').find(b => b.className.includes('bg-emerald-600') && !b.textContent.includes('Generate Baseline'));
    if (addBtn) {
      await user.click(addBtn);
    } else {
       // fallback
       await user.keyboard('{Enter}');
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/trainer/questions',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
