import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

vi.mock('@monaco-editor/react', () => {
  return {
    default: ({ value, onChange }) => (
      <textarea
        data-testid="monaco-editor"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  };
});

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.alert = vi.fn();

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

  it('switches between Builder and Analytics tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Default is builder (Content Builder)
    expect(screen.getByText(/Content Builder/i)).toBeInTheDocument();

    // Switch to Analytics
    const analyticsBtn = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsBtn);

    // The panel actually renders an h2 "Cohort Analytics" when the tab is switched
    const headers = await screen.findAllByText(/Cohort Analytics/i);
    expect(headers.length).toBeGreaterThan(0);

    // Switch back to Builder
    const builderBtn = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderBtn);

    // Verify it switches back by checking for elements in builder tab like "Question Definition"
    expect(await screen.findByText(/Question Definition/i)).toBeInTheDocument();
  });
});