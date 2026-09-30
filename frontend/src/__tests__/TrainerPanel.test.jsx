import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null }));
vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="mock-editor" value={value} onChange={e => onChange(e.target.value)} />
  )
}));
global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };

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
            files: [{ file_path: 'index.html', content: '<h1>Hi</h1>' }],
            testSpec: { type: 'puppeteer', files: [{ file_path: 'test.js', content: 'test()' }] }
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
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

  it('switches to builder tab and edits files', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Click question to load it
    const questionLink = screen.getByText('Question 1');
    await user.click(questionLink);

    // Wait for fetch of the selected question
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const builderTab = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);

    // Find the toggle button for Starter Editor
    const toggleStarterBtn = await screen.findByRole('button', { name: /Starter Template/i });
    await user.click(toggleStarterBtn);

    // Editor should be rendered
    const editors = await screen.findAllByTestId('mock-editor');
    expect(editors.length).toBeGreaterThan(0);
  });

  it('switches to analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    const analyticsTab = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    // The screen output shows "Cohort Score Distribution"
    expect(await screen.findByText(/Cohort Score Distribution/i)).toBeInTheDocument();
  });
});
