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
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
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

  it('switches to analytics tab and displays analytics data', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const analyticsTab = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    expect(await screen.findByText(/Avg. Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Pass Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Submissions/i)).toBeInTheDocument();

    // Check that we can switch back
    const builderTab = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);

    expect(screen.getByRole('button', { name: /Save Draft/i })).toBeInTheDocument();
  });

  it('adds, updates, and removes interaction steps', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const question1 = await screen.findByText('Question 1');
    await user.click(question1);

    const addInteractionButton = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addInteractionButton);

    const actionSelects = document.querySelectorAll('select');
    // There are multiple selects (Test type, DOM Assertion type).
    // The "Action" select for interactions is the last one added after clicking "Add Step".
    // Alternatively, we can find by a known label but testing-library/react without label association can be tricky.
    // The new select has options from INTERACTION_ACTIONS (e.g. 'click', 'hover').
    const actionSelect = Array.from(actionSelects).find(select =>
      Array.from(select.options).some(opt => opt.value === 'click')
    );
    expect(actionSelect).toBeInTheDocument();

    await user.selectOptions(actionSelect, 'click');
    expect(actionSelect.value).toBe('click');

    // After selecting 'click', a 'Selector' input appears.
    // It's a text input. We can find it by looking for inputs. The exact one we want is the last text input since it was just added.
    const inputs = document.querySelectorAll('input[type="text"]');
    const selectorInput = inputs[inputs.length - 1];

    await user.type(selectorInput, '#test-id');
    expect(selectorInput.value).toBe('#test-id');

    const allButtons = await screen.findAllByRole('button');
    // Find the one containing the Trash2 icon (which has a generic class like text-gray-300 hover:text-red-500)
    // Find the correct trash button for the interaction step.
    // Assuming it's the last button on the screen as it was just appended.
    const trashBtns = document.querySelectorAll('button.text-gray-300.hover\\:text-red-500');
    const trashBtn = trashBtns[trashBtns.length - 1];

    if(trashBtn) {
        await user.click(trashBtn);

        // Wait for the step to be removed from the DOM
        await waitFor(() => {
          const remainingSelects = document.querySelectorAll('select');
          const isActionSelectGone = Array.from(remainingSelects).every(select =>
              !Array.from(select.options).some(opt => opt.value === 'click' && opt.textContent === 'Click')
          );
          expect(isActionSelectGone).toBe(true);
        });
    }
  });

  it('generates a baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const question1 = await screen.findByText('Question 1');
    await user.click(question1);

    const generateBaselineBtn = await screen.findByRole('button', { name: /Generate Baseline/i });
    expect(generateBaselineBtn).not.toBeDisabled();

    await user.click(generateBaselineBtn);

    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({ method: 'POST' }));
    });
  });
});
