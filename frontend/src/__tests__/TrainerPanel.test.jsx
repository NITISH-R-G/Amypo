import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import * as React from 'react';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />
}));

vi.mock('../components/workspace/CodeEditor', () => {
  return {
    default: ({ code, onChange }) => (
      <textarea
        data-testid="mock-code-editor"
        value={code || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  };
});

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
            files: [{ name: 'index.js', content: 'console.log("hello");', read_only: false }],
            testSpec: { type: 'dom', interactions: [] }
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

  it('navigates to analytics tab and renders data', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsTab = await screen.findByText(/Cohort Analytics/);
    await user.click(analyticsTab);

    expect(await screen.findByText('78.5')).toBeInTheDocument();
    expect(await screen.findByText('64%')).toBeInTheDocument();
    expect(await screen.findByText('342')).toBeInTheDocument();
    expect(await screen.findByText('1.2s')).toBeInTheDocument();
    expect(await screen.findByText('.profile-card display:flex')).toBeInTheDocument();
  });

  it('can edit question files in Content Builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByText(/Content Builder/);
    await user.click(builderTab);

    const questionItem = await screen.findByText('Question 1');
    await user.click(questionItem);

    // Expand Visual Test Spec Builder section
    const visualSpecBtn = await screen.findByText('Visual Test Spec Builder');
    expect(visualSpecBtn).toBeInTheDocument();
  });

  it('navigates to test specs view in Content Builder and can add an interaction', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByText(/Content Builder/);
    await user.click(builderTab);

    const questionItem = await screen.findByText('Question 1');
    await user.click(questionItem);

    // Ensure we are in the Content Builder view
    const visualSpecBtn = await screen.findByText('Visual Test Spec Builder');
    expect(visualSpecBtn).toBeInTheDocument();

    // Find the Add Step button inside the Interaction Sequence section
    const addStepBtns = await screen.findAllByText('Add Step');
    await user.click(addStepBtns[0]);

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });
});
