import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

// Mock ResizeObserver for Chart.js
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="code-editor" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  )
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />
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

  it('switches tabs and interacts with the test spec builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const analyticsTabBtn = screen.getByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsTabBtn);
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();

    const builderTabBtn = screen.getByRole('button', { name: /Content Builder/i });
    await user.click(builderTabBtn);
    expect(await screen.findByText('Visual Test Spec Builder')).toBeInTheDocument();

    // The default tests are rendered. We will have 2 tests. Wait for 'exists' value in a select.
    const selects = await screen.findAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);

    const addBtn = screen.getByRole('button', { name: /Add Assertion/i });
    await user.click(addBtn);

    const newSelects = await screen.findAllByRole('combobox');
    expect(newSelects.length).toBeGreaterThan(selects.length);

    // Click on a trash button (there are many now since we have multiple tests + interactions)
    // To be precise we could find the buttons inside the test spec builder
    const deleteBtns = screen.getAllByRole('button').filter(btn => btn.className.includes('hover:text-red-500'));
    if(deleteBtns.length > 0) {
      await user.click(deleteBtns[deleteBtns.length - 1]);
      const finalSelects = await screen.findAllByRole('combobox');
      expect(finalSelects.length).toBeLessThan(newSelects.length);
    }
  });
});
