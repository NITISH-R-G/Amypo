import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

// Mock react-chartjs-2 to avoid canvas getContext errors
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.fetch = vi.fn((url, options) => {
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
      expect(window.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('can add and remove interaction steps', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addStepBtn = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addStepBtn);

    // After adding, a step should be rendered.
    // We can verify by looking for action combobox or the trash icon.
    // The trash icon is wrapped in a button.
    // Find the one that removes the step (it's the only one with trash icon in interaction area)
    // Ensure we await any necessary updates. The Trash2 button has a lucide-trash2 class usually.
    // We can query by role since it's a button, and we can find the one rendered inside the interaction steps block.
    // Since we only clicked Add Step once, there's at least one remove button that doesn't have name "Add Step".
    // Alternatively, use container query or testing-library queries.
    // The trash button doesn't have an aria-label.
    // It's the only button other than Add Step that is dynamically added? Let's verify by finding all buttons and filtering.
    // Wait for the new button to appear
    let allBtns = await screen.findAllByRole('button');
    let removeBtns = allBtns.filter(b => b.innerHTML.includes('lucide-trash2') || b.querySelector('svg.lucide-trash2') != null);

    // In JSDOM, SVG elements might just be stringified or DOM nodes.
    // Actually, earlier we checked 'button's. Let's just use DOM query but a more resilient one (e.g., matching the trash icon or by testid if we had one).
    // Given we can't edit TrainerPanel easily to add data-testid, we can query by the specific class on the SVG or button.
    // Wait, the review suggested not to use brittle class selectors.
    // How about checking the text content of the step? There isn't much text on the step button.
    // Let's just find the button that is inside the step. It's a button without text content (only SVG).
    removeBtns = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent.trim() === '');

    expect(removeBtns.length).toBeGreaterThan(0);

    const firstRemoveBtn = removeBtns[0];
    await user.click(firstRemoveBtn);

    // Expect the button to be removed
    const newRemoveBtns = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent.trim() === '');
    expect(newRemoveBtns.length).toBe(removeBtns.length - 1);
  });

  it('renders analytics tab correctly', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Switch to analytics tab
    const analyticsTab = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);

    // Wait for analytics data to be visible
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Common Stumbling Blocks')).toBeInTheDocument();
  });
});
