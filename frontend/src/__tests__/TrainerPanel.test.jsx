import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Mock Bar Chart</div>,
  Doughnut: () => <div data-testid="mock-doughnut-chart">Mock Doughnut Chart</div>,
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, language }) => (
    <textarea
      data-testid={`mock-code-editor-${language}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
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
            testSpec: { version: '1.0', viewports: [{ name: 'desktop', width: 1366, height: 768 }] }
          })
        });
      }

      if (url.includes('/api/trainer/analytics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            analytics: {
              totalAttempts: 10,
              passRate: 75,
              failedTests: [{ test: 'Ensure header is red', count: 5 }],
              scoreHistogram: [1, 2, 3, 4, 5]
            }
          })
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

  it('renders default viewports in test spec JSON output', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const showJsonBtn = await screen.findByText(/Generated Spec JSON Output/i);
    expect(showJsonBtn).toBeInTheDocument();
    fireEvent.click(showJsonBtn);

    const jsonOutput = await screen.findByText(/"name": "desktop"/i);
    expect(jsonOutput).toBeInTheDocument();
    expect(await screen.findByText(/1366/i)).toBeInTheDocument();
    expect(await screen.findByText(/768/i)).toBeInTheDocument();
  });

  it('renders diagnostics list and analytics charts', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const analyticsTab = await screen.findByText(/Cohort Analytics/i);
    expect(analyticsTab).toBeInTheDocument();
    fireEvent.click(analyticsTab);

    // Wait for the mock charts to render (no real API call is made in the component for analytics yet, it's mocked data)
    expect(await screen.findByTestId('mock-bar-chart')).toBeInTheDocument();

    expect(screen.getByText('Common Stumbling Blocks')).toBeInTheDocument();
    expect(screen.getByText('.profile-card display:flex')).toBeInTheDocument();

    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
  });
});
