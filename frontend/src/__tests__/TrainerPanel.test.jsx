import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
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
      if (url.includes('/api/trainer/questions') && options && options.method === 'POST') {
         return Promise.resolve({
           ok: true,
           json: () => Promise.resolve({
             question: { id: 2, title: 'Question 2', description: 'Desc 2', allowed_libraries: [] },
             baseline: { queued: true, version: 1 }
           })
         });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    // Mock getContext for canvas elements (often needed by chart libraries or other canvas components)
    HTMLCanvasElement.prototype.getContext = vi.fn();
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

  it('switches tabs properly between Content Builder and Cohort Analytics', async () => {
    const user = userEvent.setup();
    renderComponent();

    const cohortAnalyticsTab = await screen.findByText(/Cohort Analytics/i);
    await user.click(cohortAnalyticsTab);

    expect(await screen.findByText(/Cohort Score Distribution/i)).toBeInTheDocument();

    const contentBuilderTab = await screen.findByText(/Content Builder/i);
    await user.click(contentBuilderTab);

    expect(await screen.findByText(/Questions/i, { selector: 'h2' })).toBeInTheDocument();
  });

  it('allows creating a new question', async () => {
    // Mock scrollIntoView to prevent errors
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Click the toggle "Add Question" button
    const toggleAddButton = screen.getAllByRole('button').find(b => b.textContent.includes('Add Question'));
    await user.click(toggleAddButton);

    const titleInput = await screen.findByPlaceholderText(/e.g. Build a Pricing Card/i);
    await user.type(titleInput, 'Question 2');

    const descInput = await screen.findByPlaceholderText(/Short description…/i);
    await user.type(descInput, 'Desc 2');

    // Now find the submit button inside the form, avoiding the toggle button
    const submitBtn = screen.getAllByRole('button', { name: /Add Question/i }).find(btn => !btn.className.includes('w-full px-4 py-3'));
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Question 2', description: 'Desc 2' })
      }));
    });
  });
});
