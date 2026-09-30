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


  it('handles question selection and updates tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });
  });

  it('adds and deletes a dom test', async () => {
    const user = userEvent.setup();
    renderComponent();

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const specTabBtn = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(specTabBtn);

    const addDomTestBtn = await screen.findByRole('button', { name: /Add Assertion/i });
    await user.click(addDomTestBtn);

    const buttons = await screen.findAllByRole('button');
    for (let btn of buttons) {
       if (btn.innerHTML.includes('lucide-trash')) {
         await user.click(btn);
         break;
       }
    }
  });

  it('adds and deletes an interaction test', async () => {
    const user = userEvent.setup();
    renderComponent();

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const specTabBtn = await screen.findByRole('button', { name: /Content Builder/i });
    await user.click(specTabBtn);

    const addIntTestBtn = await screen.findByRole('button', { name: /Add Step/i });
    await user.click(addIntTestBtn);

    const buttons = await screen.findAllByRole('button');
    for (let btn of buttons) {
       if (btn.innerHTML.includes('lucide-trash')) {
         await user.click(btn);
       }
    }
  });


  it('handles generating baseline', async () => {
    const user = userEvent.setup();
    renderComponent();

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    // global.fetch mock already has trainer/questions/1/draft PUT mocked
    const genBtn = await screen.findByRole('button', { name: /Generate Baseline/i });
    await user.click(genBtn);

    // After this, it should do the PUT
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
    });
  });


  it('switches to analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const questionBtn = await screen.findByText('Question 1');
    await user.click(questionBtn);

    const analyticsBtn = await screen.findByRole('button', { name: /Cohort Analytics/i });
    await user.click(analyticsBtn);

    // Expect to see Performance Analytics or something related
    expect(await screen.findByText(/Cohort Score Distribution/i)).toBeInTheDocument();
  });

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
});
