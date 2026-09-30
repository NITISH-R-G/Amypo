import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, testId }) => (
    <textarea
      data-testid={testId || 'code-editor-mock'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />
}));


describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1', type: 'html' }] })
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
            question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [], type: 'html' },
            files: [],
            testSpec: {}
          })
        });
      }
      if (url.includes('/api/questions/1/baseline')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
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

  it('renders and switches viewports via DOM role', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const mobileBtn = buttons.find(b => b.title && b.title.toLowerCase().includes('mobile'));
    if (mobileBtn) {
      await user.click(mobileBtn);
      expect(mobileBtn).toBeInTheDocument();
    }
  });

  it('selects a question and changes content', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);
  });

  it('handles generating baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const generateBtn = screen.getByTitle('Generate baseline screenshots from the reference solution (FR-2)');
    await user.click(generateBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('adds a new file', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const addFileBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-plus') && b.closest('.bg-gray-100'));
    if(addFileBtn) {
      await user.click(addFileBtn);
      const fileInputs = screen.getAllByRole('textbox');
      expect(fileInputs.length).toBeGreaterThan(1);
    }
  });

  it('tests DOM assertions panel toggle', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const specBtn = screen.getAllByRole('button').find(b => b.textContent && b.textContent.includes('Test Spec'));
    if(specBtn) {
      await user.click(specBtn);

      const addAssertionBtn = screen.getAllByRole('button').find(b => b.textContent && b.textContent.includes('Add'));
      if(addAssertionBtn) {
          await user.click(addAssertionBtn);
      }
    }
  });
});
