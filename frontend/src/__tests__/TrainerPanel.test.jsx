import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import * as UseToastModule from '../components/ui/use-toast';

describe('TrainerPanel', () => {
  let toastMock;

  beforeEach(() => {
    vi.clearAllMocks();
    toastMock = vi.fn();
    vi.spyOn(UseToastModule, 'useToast').mockReturnValue({ toast: toastMock, toasts: [], dismiss: vi.fn() });

    global.fetch = vi.fn((url, options) => {
      if (url === '/api/trainer/questions' && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question: { id: 2, title: 'New Question', description: 'New Desc', allowed_libraries: [] } })
        });
      }
      if (url.includes('/api/questions/1/baseline') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ question_id: 1, version: 1, job_id: 'job-1' })
        });
      }
      if (url === '/api/questions') {
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

  it('queues a baseline generation', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Select the question to enable baseline button
    const questionLink = await screen.findByText('Question 1');
    await user.click(questionLink);

    // Wait for Generate Baseline button (it might be hidden on small screens but rendered)
    const generateBaselineBtn = await screen.findByText('Generate Baseline');
    expect(generateBaselineBtn).toBeInTheDocument();

    // Reverting to wrapping user interaction in act manually if act warning pops up for sync call,
    // actually, in this test it fails to find 'Builder' which isn't exact text. Let's just click 'Generate Baseline'.
    await user.click(generateBaselineBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
        method: 'POST'
      }));
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Baseline Queued'
      }));
    });
  });

  it('creates a new question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addQuestionBtn = await screen.findByRole('button', { name: /Add Question/i });
    await user.click(addQuestionBtn);

    const titleInput = await screen.findByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question');

    const descInput = await screen.findByPlaceholderText('Short description…');
    await user.type(descInput, 'New Desc');

    // The button only says "Save" or is missing 'Create Question' text, find the specific one
    // looking by its structure or just taking the button in the 'Add Question' section.
    // Finding button by text if it says "Add" or similar since we checked grep
    // Actually the button text is missing in the previous grep, let's just query by button in that area.
    // Or we can find by class or just find the button disabled state, etc.
    // Let's find it by role button that contains specific icon or just use index.
    const buttons = await screen.findAllByRole('button');
    const addSubmitBtn = buttons.find(b => b.className && b.className.includes('bg-emerald-600') && !b.textContent.includes('Save Draft'));
    // Since we know the handleCreateQuestion is on it, let's just click it
    if (addSubmitBtn) await user.click(addSubmitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST'
      }));
    });
  });
});
