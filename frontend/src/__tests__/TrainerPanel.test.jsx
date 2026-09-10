import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

// Completely mock react-chartjs-2 to avoid canvas issues
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the ResizeObserver for Chart.js which is used in TrainerPanel
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

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

  it('handles question selection and allows updating test specs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionItem = await screen.findByText('Question 1');
    await user.click(questionItem);

    // Test clicking on Add Assertion for test builder
    const addButton = await screen.findByRole('button', { name: /Add Assertion/i });
    await user.click(addButton);

    // verify it added a new test row
    expect(await screen.findAllByRole('combobox')).not.toHaveLength(0);

    // Change a test type to css
    const typeSelects = await screen.findAllByRole('combobox');
    if (typeSelects.length > 0) {
      await user.selectOptions(typeSelects[0], 'css');
    }
  });

  it('renders analytics view when initialTab is analytics', async () => {
    renderComponent({ initialTab: 'analytics', embedded: true });

    // We should see Analytics specific texts
    expect(await screen.findByText(/Avg Performance/i)).toBeInTheDocument();
  });
});
