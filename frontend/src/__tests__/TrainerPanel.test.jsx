import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

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
            testSpec: { tests: { dom: [], css: [], interactions: [] } }
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

    const q1 = await screen.findByText('Question 1');
    expect(q1).toBeInTheDocument();

    // Select the question by clicking on it
    await user.click(q1);

    // Now the Visual Test Spec Builder should be visible
    await waitFor(async () => {
       const vtsb = await screen.findByText('Visual Test Spec Builder');
       expect(vtsb).toBeInTheDocument();
    });

    const addAssertionBtns = screen.getAllByRole('button', { name: /Add Assertion/i });
    if (addAssertionBtns.length > 0) {
      await user.click(addAssertionBtns[0]);
    }

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('handles Generate Baseline button', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    const q1 = await screen.findByText('Question 1');
    await user.click(q1);

    const generateBaselineBtn = await screen.findByRole('button', { name: /Generate Baseline/i });
    if (generateBaselineBtn) {
      await user.click(generateBaselineBtn);
    }
  });

  it('handles cohort analytics toggle', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    const analyticsBtn = await screen.findByRole('button', { name: /Cohort Analytics/i });
    if (analyticsBtn) {
      await user.click(analyticsBtn);
    }
  });

  it('covers test interactions tab', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    const q1 = await screen.findByText('Question 1');
    await user.click(q1);

    const addAssertionBtns = screen.getAllByRole('button', { name: /Add Assertion/i });
    if (addAssertionBtns.length > 0) {
      await user.click(addAssertionBtns[0]);
    }
  });

  it('covers question title editing', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    const q1 = await screen.findByText('Question 1');
    await user.click(q1);

    // Click Content Builder to make sure we're on the right view, if needed
    const contentBuilderBtn = await screen.findByRole('button', { name: /Content Builder/i });
    if (contentBuilderBtn) {
      await user.click(contentBuilderBtn);
    }

    // Try finding the input by placeholder or value since label is missing
    const inputs = screen.getAllByRole('textbox');
    if (inputs.length > 0) {
      // Typically the first textbox is the title if there's no explicit label
      await user.clear(inputs[0]);
      await user.type(inputs[0], 'New Title Modified');
    }
  });
});
