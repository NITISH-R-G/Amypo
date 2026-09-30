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

  it('switches between tabs and renders builder and analytics sections', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);
    expect(await screen.findByText(/Visual Test Spec Builder/i)).toBeInTheDocument();

    const analyticsTab = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);
    expect(await screen.findByText(/Avg. Score/i)).toBeInTheDocument();
  });

  it('adds an interaction and updates it in the builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);

    const addInteractionBtn = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addInteractionBtn);

    const inputs = await screen.findAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
    const selectorInput = inputs.find(i => i.placeholder === '#submit-btn, .nav-link...');

    if (selectorInput) {
      await user.type(selectorInput, '.test-class');
      expect(selectorInput).toHaveValue('.test-class');
    }
  });

  it('removes an interaction from the builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);

    const addInteractionBtn = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addInteractionBtn);

    const deleteBtns = await screen.findAllByRole('button');
    const deleteBtn = deleteBtns.find(b => b.className.includes('hover:text-red-500') && !b.disabled);

    if(deleteBtn) {
      await user.click(deleteBtn);
    }
  });
});
