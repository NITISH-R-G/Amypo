import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

import { act } from '@testing-library/react';

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
    window.HTMLElement.prototype.scrollIntoView = function() {};
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
      if (url.includes('/api/trainer/questions')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, question: { id: 2, title: 'New Question' }, baseline: { queued: true, version: 1 } })
          });
        }
      }
      if (url.includes('/api/questions/1/baseline')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, question_id: 1, version: 2, job_id: 'job_123' })
          });
        }
      }
      return Promise.reject(new Error('not found: ' + url));
    });
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

  it('can switch tabs', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const analyticsTab = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();

    const builderTab = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);
    expect(await screen.findByText('Visual Test Spec Builder')).toBeInTheDocument();
  });

  it('can add a new question', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const addButton = screen.getAllByRole('button', { name: /Add/i })[0];
    await user.click(addButton);

    const titleInput = await screen.findByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question Title');

    const descInput = await screen.findByPlaceholderText('Short description…');
    await user.type(descInput, 'New question description');

    const submitAddButtons = screen.getAllByRole('button', { name: /Add Question/i });
    // the first one is the toggle, the second one is the submit button
    const submitAddButton = submitAddButtons[submitAddButtons.length - 1];
    await user.click(submitAddButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New Question Title', description: 'New question description' })
      }));
    });
  });

  it('generates baseline for selected question', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const baselineButton = await screen.findByRole('button', { name: /Generate Baseline/i });
    await user.click(baselineButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('manipulates assertions and interactions in the builder', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const addAssertionBtn = await screen.findByRole('button', { name: /Add Assertion/i });
    await act(async () => {
      await user.click(addAssertionBtn);
    });

    const addStepBtn = await screen.findByRole('button', { name: /Add Step/i });
    await act(async () => {
      await user.click(addStepBtn);
    });

    const assertions = await screen.findAllByText('DOM Structure');
    expect(assertions.length).toBeGreaterThan(0);
  });
});
