import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';
import * as useToastModule from '../components/ui/use-toast';

describe('TrainerPanel', () => {
  let toastMock;

  beforeEach(() => {
    vi.clearAllMocks();
    toastMock = vi.fn();
    vi.spyOn(useToastModule, 'useToast').mockReturnValue({ toast: toastMock });
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
      if (url.includes('/api/trainer/questions') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        if (body.title === 'FailMe') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Server exploded' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 2, title: body.title, description: body.description },
            baseline: { queued: true, version: 1 }
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

  it('creates a new question', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Open add question form
    const addQuestionToggle = await screen.findByRole('button', { name: /Add Question/i });
    await user.click(addQuestionToggle);

    // Type title and description
    const titleInput = await screen.findByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Q Title');

    const descInput = await screen.findByPlaceholderText('Short description…');
    await user.type(descInput, 'A nice description');

    // Submit
    const submitBtns = await screen.findAllByRole('button', { name: /Add Question/i });
    const submitBtn = submitBtns[submitBtns.length - 1]; // The one in the form
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New Q Title', description: 'A nice description' })
      }));
    });

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Question Created & Queued'
    }));
  });

  it('shows error when creating question with empty title', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const addQuestionToggle = await screen.findByRole('button', { name: /Add Question/i });
    await user.click(addQuestionToggle);

    const submitBtns = await screen.findAllByRole('button', { name: /Add Question/i });
    const submitBtn = submitBtns[submitBtns.length - 1];
    await user.click(submitBtn);

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Title Required',
      variant: 'destructive'
    }));
  });

  it('shows error when server fails to create question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const addQuestionToggle = await screen.findByRole('button', { name: /Add Question/i });
    await user.click(addQuestionToggle);

    const titleInput = await screen.findByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'FailMe');

    const submitBtns = await screen.findAllByRole('button', { name: /Add Question/i });
    const submitBtn = submitBtns[submitBtns.length - 1];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Create Failed',
        variant: 'destructive',
        description: 'Server exploded'
      }));
    });
  });
});
