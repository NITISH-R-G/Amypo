import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, baseline_id: 100 })
        })
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1' }] })
        });
      }
      if (url.includes('/api/trainer/questions/1/draft')) {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            title: 'Question 1',
            description: 'Desc',
            initial_code: 'code',
            difficulty: 'easy',
            category: 'react',
            test_spec: { dom_tests: [], css_tests: [] }
          })
        });
      }
      if (url.includes('/api/trainer/questions')) {
          if (options?.method === 'POST') {
             return Promise.resolve({
                 ok: true,
                 json: () => Promise.resolve({ id: 2, title: 'New Question' })
             })
          }
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    // We are overriding ResizeObserver here since TrainerPanel uses react-chartjs-2 which requires ResizeObserver
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
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

    // Select the question
    const qButton = await screen.findByText('Question 1');
    await user.click(qButton);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    // Need to use waitFor on the title since the data might load dynamically
    // A more robust check might be just searching for text that shows it's selected
    await waitFor(() => {
        expect(screen.getAllByText('Question 1').length).toBeGreaterThan(0);
    });

    // find the save button based on the label in the component
    const saveButton = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Save Draft'));
    await user.click(saveButton);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        '/api/trainer/questions/1/draft',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('creates a new question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addButtons = screen.getAllByRole('button', { name: /add/i });
    const addButton = addButtons.find(b => b.textContent.trim() === 'Add');
    await user.click(addButton);

    const titleInput = screen.getByPlaceholderText('e.g. Build a Pricing Card');
    await user.type(titleInput, 'New Question');

    const descInput = document.querySelector('textarea[placeholder="Short description…"]');
    if (descInput) {
        await user.type(descInput, 'A new description');
    }

    const createButtons = screen.getAllByRole('button', { name: /add question/i });
    const createButton = createButtons[createButtons.length - 1]; // Pick the actual submit button

    await user.click(createButton);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        '/api/trainer/questions',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('generates a baseline', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(window.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const qButton = await screen.findByText('Question 1');
      await user.click(qButton);

      await waitFor(() => {
        expect(window.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
      });

      const genBaselineButton = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Generate Baseline'));
      await user.click(genBaselineButton);

      await waitFor(() => {
         expect(window.fetch).toHaveBeenCalledWith(
             '/api/questions/1/baseline',
             expect.objectContaining({ method: 'POST' })
         )
      });
  });
});
