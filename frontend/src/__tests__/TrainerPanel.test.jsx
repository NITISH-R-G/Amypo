import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange, language }) => (
    <textarea data-testid={`code-editor-${language}`} value={value} onChange={e => onChange(e.target.value)} />
  )
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1/baseline') || url.includes('/api/trainer/questions/1/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, queued: true })
        });
      }
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

    // We mock ResizeObserver here just in case some other library needs it
    global.ResizeObserver = class ResizeObserver {
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
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const selectButtons = screen.getAllByRole('button').filter(b => b.textContent.includes('Question 1') && b.closest('div.bg-white'));
    if (selectButtons.length > 0) {
        await act(async () => {
            selectButtons[0].click();
        });
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
    });

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await act(async () => {
        await user.click(saveButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('triggers baseline generation', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const selectButtons = screen.getAllByRole('button').filter(b => b.textContent.includes('Question 1') && b.closest('div.bg-white'));
      if (selectButtons.length > 0) {
          await act(async () => {
              selectButtons[0].click();
          });
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft');
      });

      const generateBaselineButton = screen.getByRole('button', { name: /Generate Base/i });
      await act(async () => {
          await user.click(generateBaselineButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
          method: 'POST'
        }));
      });
  });
});
