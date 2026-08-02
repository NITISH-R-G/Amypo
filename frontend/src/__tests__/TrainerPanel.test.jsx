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

  it('adds and updates DOM assertions and interaction steps', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Verify UI buttons for assertions and interactions are rendered
    const addAssertionBtn = await screen.findByRole('button', { name: /Add Assertion/i });
    expect(addAssertionBtn).toBeInTheDocument();

    await user.click(addAssertionBtn);

    // Switch to Content Builder tab (which shows Spec Builder)
    const contentBuilderBtn = await screen.findByText(/Content Builder/i);
    await user.click(contentBuilderBtn);

    // Wait for the assertion block to appear. It defaults to 'exists' assertion, which has a Target Selector input.
    // Wait for the label to appear
    await waitFor(() => {
      const labels = screen.getAllByText(/Target Selector/i);
      expect(labels.length).toBeGreaterThan(0);
    });
    const targetLabels = screen.getAllByText(/Target Selector/i);
    const selectorInput = targetLabels[0].nextElementSibling;
    expect(selectorInput).toBeInTheDocument();

    // Type into the selector input
    // The simulated user input might fail if it's not a proper HTML element. We can use fireEvent.change.
    fireEvent.change(selectorInput, { target: { value: '.my-element' } });
    expect(selectorInput).toHaveValue('.my-element');

    // Also add an interaction step
    const addInteractionBtn = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addInteractionBtn);

    // There might be multiple Selector inputs now (one 'Target Selector' for assertion, one 'Selector' for interaction if default needs it)
    // The first interaction defaults to 'click' which requires a selector.
    // The label for the interaction step is 'Selector'. Let's look for exactly that using text match.
    const interactionSelectorLabels = await screen.findAllByText(/^Selector$/i);

    // Find the input associated with the 'Selector' label
    const interactionLabel = interactionSelectorLabels.find(el => el.tagName.toLowerCase() === 'label');
    if (interactionLabel) {
      const interactionInput = interactionLabel.nextElementSibling;
      if (interactionInput && interactionInput.tagName.toLowerCase() === 'input') {
        fireEvent.change(interactionInput, { target: { value: '#btn-submit' } });
        expect(interactionInput).toHaveValue('#btn-submit');
      }
    }
  });
});
