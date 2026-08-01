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

  it('allows adding and modifying interaction steps', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addStepButton = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addStepButton);

    const actionSelects = await screen.findAllByRole('combobox');
    expect(actionSelects.length).toBeGreaterThan(0);

    // Choose an action that requires a selector
    await user.selectOptions(actionSelects[actionSelects.length - 1], 'click');

    const selectorInputs = await screen.findAllByDisplayValue('');
    const selectorInput = selectorInputs.find(el => el.className.includes('font-mono'));

    if (selectorInput) {
      await user.type(selectorInput, '.my-button');
      expect(selectorInput).toHaveValue('.my-button');
    }
  });

  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    renderComponent();

    const builderTab = await screen.findByRole('button', { name: /Builder/i });
    const analyticsTab = await screen.findByRole('button', { name: /Analytics/i });

    await user.click(analyticsTab);
    expect(await screen.findByText(/Avg. Score/i)).toBeInTheDocument();

    await user.click(builderTab);
    expect(await screen.findByText(/Visual Test Spec Builder/i)).toBeInTheDocument();
  });
});
