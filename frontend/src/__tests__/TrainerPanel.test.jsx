import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
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

  it('switches between Content Builder and Cohort Analytics tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Verify default tab
    expect(screen.getByText('Content Builder')).toBeInTheDocument();

    // Switch to Cohort Analytics
    const analyticsTab = screen.getByText(/Cohort Analytics/);
    await user.click(analyticsTab);

    // Wait for the analytics specific content to render
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Avg. Score')).toBeInTheDocument();

    // Switch back to Content Builder
    const builderTab = screen.getByText(/Content Builder/);
    await user.click(builderTab);

    expect(await screen.findByText('Visual Test Spec Builder')).toBeInTheDocument();
  });

  it('adds an interaction step and updates its value', async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const addStepButton = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addStepButton);

    expect(screen.getByText('Step 1 Action')).toBeInTheDocument();

    // Choose "Type" action
    const selects = screen.getAllByRole('combobox');
    const actionSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'type'));
    expect(actionSelect).toBeInTheDocument();
    await user.selectOptions(actionSelect, 'type');

    // Input values
    const inputs = screen.getAllByRole('textbox');
    // For type action we need selector and value
    const selectorInput = inputs[1]; // Adjust if needed based on the UI layout

    // Assuming the second text input might be the selector based on actionNeedsSelector
    if(selectorInput) {
       await user.type(selectorInput, '.input-class');
    }

    // The JSON preview should update
    const previewBtn = screen.getByText(/Generated Spec JSON Output/);
    await user.click(previewBtn);

    // Wait for text in JSON output
    await waitFor(() => {
       const jsonOutput = screen.getByText(/"action": "type"/i);
       expect(jsonOutput).toBeInTheDocument();
    });
  });
});
