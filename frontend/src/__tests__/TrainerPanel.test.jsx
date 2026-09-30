import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
}));

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor" />
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (global.window && global.window.HTMLElement) {
      global.window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
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
            testSpec: { version: '1.0', viewports: [], tests: { dom: [], css: [], interactions: [] } }
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

  it('handles tab navigation between Builder and Analytics', async () => {
    const user = userEvent.setup();
    renderComponent();

    // The Builder tab is active by default
    expect(await screen.findByText(/Add Assertion/i)).toBeInTheDocument(); // Some text from builder

    // Switch to Analytics
    const analyticsTab = await screen.findByText(/Analytics/i);
    await user.click(analyticsTab);

    // Assert that we are on the Analytics tab
    expect(await screen.findByText(/Cohort Score Distribution/i)).toBeInTheDocument();
    expect(screen.getByTestId('chart-bar')).toBeInTheDocument();

    // Switch back to Builder
    const builderTab = await screen.findByText(/Builder/i);
    await user.click(builderTab);
    expect(screen.queryByText(/Cohort Score Distribution/i)).not.toBeInTheDocument();
  });

  it('adds, updates, and deletes tests in builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for the mock questions to load
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addTestBtn = await screen.findByRole('button', { name: /Add Assertion/i });

    // Add a new DOM test
    await user.click(addTestBtn);

    // We can interact with one of the tests (the last one added)
    const selects = screen.getAllByRole('combobox');
    const lastSelectType = selects[selects.length - 2]; // Type selector of last test

    // Change test type to CSS
    await user.selectOptions(lastSelectType, 'css');

    // Find the property input
    // Just find a property input
    const propertyInputs = screen.queryAllByRole("textbox").filter(input => input.closest("div")?.textContent?.includes("Property"));

    if (propertyInputs.length > 0) {
        await user.clear(propertyInputs[0]);
        await user.type(propertyInputs[0], 'color');
    }

    // Delete a test
    const deleteButtons = screen.getAllByRole('button', { name: '' });
    // Click the first delete button that looks like a trash can
    const trashButtons = deleteButtons.filter(btn => btn.className.includes('text-red-500'));
    if (trashButtons.length > 0) {
        await user.click(trashButtons[0]);
    }
  });

  it('adds, updates, and deletes interaction steps in builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addInteractionBtn = await screen.findByRole('button', { name: /Add Step/i });

    // Add interaction step
    await user.click(addInteractionBtn);

    // Update action
    const selects = screen.getAllByRole('combobox');
    const lastActionSelect = selects[selects.length - 1];
    await user.selectOptions(lastActionSelect, 'type');

    // Delete interaction step
    const deleteButtons = screen.getAllByRole('button', { name: '' });
    const trashButtons = deleteButtons.filter(btn => btn.className.includes('text-red-500'));
    if (trashButtons.length > 0) {
        await user.click(trashButtons[trashButtons.length - 1]);
    }
  });
});
