import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    HTMLCanvasElement.prototype.getContext = () => {};
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

  it('interacts with builder tab elements', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    // Select the question
    const qButton = screen.getByText('Question 1');
    await user.click(qButton);

    // Switch to Builder tab
    const builderTab = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);

    // Add an interaction step (type action)
    const addStepBtn = screen.getByRole('button', { name: /Add Step/i });
    await user.click(addStepBtn);

    // Change action to 'type'
    const actionSelects = screen.getAllByRole('combobox');
    const typeActionSelect = actionSelects[actionSelects.length - 1]; // Assuming it's the last added
    await user.selectOptions(typeActionSelect, 'type');

    // Type in selector, value
    const selectorInputs = screen.getAllByRole('textbox').filter(input => input.closest('div').textContent.includes('CSS Selector'));
    const valueInputs = screen.getAllByRole('textbox').filter(input => input.closest('div').textContent.includes('Value'));

    if (selectorInputs.length > 0) {
      await user.type(selectorInputs[0], '.test-class');
    }

    if (valueInputs.length > 0) {
      await user.type(valueInputs[0], 'test-value');
    }

    // Toggle "Wait for visible" and "Clear before typing" checkboxes
    const waitCheckbox = screen.getAllByRole('checkbox', { name: /Wait for visible/i })[0];
    const clearCheckbox = screen.getAllByRole('checkbox', { name: /Clear before typing/i })[0];

    if (waitCheckbox) await user.click(waitCheckbox);
    if (clearCheckbox) await user.click(clearCheckbox);

    // Change delay
    const delayInputs = screen.getAllByRole('spinbutton').filter(input => input.closest('div').textContent.includes('Settle Delay (ms)'));
    if (delayInputs.length > 0) {
      await user.clear(delayInputs[0]);
      await user.type(delayInputs[0], '100');
    }

    // Delete step
    const deleteButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg.lucide-trash2'));
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);
    }

    // View JSON
    const jsonPreviewBtn = screen.getByText(/Generated Spec JSON Output/i);
    await user.click(jsonPreviewBtn);
  });

  it('renders analytics tab', async () => {
    vi.mock('react-chartjs-2', () => ({
      Bar: () => null,
      Doughnut: () => null,
    }));
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Select the question
    const qButton = screen.getByText('Question 1');
    await user.click(qButton);

    // Switch to Analytics tab
    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);

    // Check if analytics metrics are rendered (from mock data in component)
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Common Stumbling Blocks')).toBeInTheDocument();
  });
});
