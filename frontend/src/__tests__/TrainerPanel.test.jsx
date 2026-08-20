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

  it('switches tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsTab = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTab);
    expect(await screen.findByText(/Avg. Score/i)).toBeInTheDocument();

    const builderTab = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
  });

  it('adds and modifies tests in Spec Builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Ensure we are in Builder tab
    const builderTab = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(builderTab);

    // Add Test
    const addTestButton = await screen.findByRole('button', { name: /Add Assertion/i });
    await user.click(addTestButton);

    const comboboxes = await screen.findAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
    await user.selectOptions(comboboxes[0], 'css');
    await user.selectOptions(comboboxes[0], 'dom');

    // Add Interaction
    const addInteractionButton = await screen.findByRole('button', { name: /Add Step/i });
    expect(addInteractionButton).toBeInTheDocument();
    await user.click(addInteractionButton);

    // We can also click to remove
    const trashButtons = await screen.findAllByRole('button');
    const trashButton = trashButtons.find(btn => btn.querySelector('svg.lucide-trash2'));
    expect(trashButton).toBeDefined();
    await user.click(trashButton);

    // Toggle JSON Output
    const jsonToggle = await screen.findByText('Generated Spec JSON Output');
    await user.click(jsonToggle);
  });
});
