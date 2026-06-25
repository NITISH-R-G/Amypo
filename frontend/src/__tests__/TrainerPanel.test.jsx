import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import { act } from 'react';

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1' }, { id: 2, title: 'Question 2', description: 'Desc 2' }] })
        });
      }
      if (url.includes('/api/trainer/questions/') && url.includes('/draft')) {
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
            testSpec: {
               "tests": [{"id":"test-1","type":"dom","assertion":"exists","target":".test"}],
               "interactionSteps": [{"id":"step-1","action":"click","selector":".btn"}]
            }
          })
        });
      }
      if (url.includes('/api/submissions/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            evaluationsOverTime: [],
            errorRates: { pass: 50, fail: 50 }
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
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

  it('selects a question and updates form', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionSelect = await screen.findByText('Question 2');
    await user.click(questionSelect);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/2/draft');
    });
  });

  it('handles add test assertion', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionSelect = await screen.findByText('Question 1');
    await user.click(questionSelect);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const addQuestionToggle = await screen.findByText('Add Question');
    await user.click(addQuestionToggle);
    const buttons = await screen.findAllByRole('button');
    const createButton = buttons.find(b => b.textContent.includes('Add Question') && b !== addQuestionToggle);
    expect(createButton).toBeDefined();
    await user.click(createButton);
    expect(await screen.findByText(/Question Definition/i)).toBeInTheDocument();
  });

  it('handles add step', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionSelect = await screen.findByText('Question 1');
    await user.click(questionSelect);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const buttons = await screen.findAllByRole('button');
    const addStepBtn = buttons.find(b => b.textContent.includes('Add Step'));
    expect(addStepBtn).toBeDefined();
    await user.click(addStepBtn);
    expect(await screen.findAllByText(/Action/i)).toHaveLength(2);
  });

  it('updates form inputs like starter code', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionSelect = await screen.findByText('Question 1');
    await user.click(questionSelect);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const inputs = await screen.findAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
    const titleInput = inputs[0];
    fireEvent.change(titleInput, { target: { value: 'New Title 123' } });
    expect(titleInput).toHaveValue('New Title 123');
  });

  it('handles assertion type selection', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionSelect = await screen.findByText('Question 1');
    await user.click(questionSelect);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const selects = await screen.findAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    const typeSelect = selects.find(s => s.innerHTML.includes('Computed CSS'));
    expect(typeSelect).toBeDefined();
    await user.selectOptions(typeSelect, 'css');
    expect(typeSelect).toHaveValue('css');
  });
});
