import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div data-testid="trainer-panel-mock">Trainer Panel Mock</div>
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/teacher']}>
      <TeacherDashboard />
    </MemoryRouter>
  );

  it('renders the teacher dashboard and fetches course data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?limit=200');
    });

    // Check elements after loading
    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('switches tabs to builder and renders TrainerPanel', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Teacher Portal/)).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText('Spec Builder').click();
    });

    expect(screen.getByTestId('trainer-panel-mock')).toBeInTheDocument();
  });

  it('deletes a question', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete Question/i });

    await act(async () => {
      deleteButton.click();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));

    await waitFor(() => {
      expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });

  it('deletes a question aborts if not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete Question/i });

    await act(async () => {
      deleteButton.click();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));

    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
  });

  it('handles analytics tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Teacher Portal/)).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText('Analytics').click();
    });

    expect(screen.getByTestId('trainer-panel-mock')).toBeInTheDocument();
  });

  it('handles fetch error on mount', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Fetch failed')));

    renderComponent();

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });

    expect(screen.queryByText('Modern Frontend Fundamentals')).not.toBeInTheDocument();
  });
});

describe('TeacherDashboard error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) });
        }
        return Promise.reject(new Error('Fetch failed'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/teacher']}>
      <TeacherDashboard />
    </MemoryRouter>
  );

  it('handles delete question error', async () => {
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete Question/i });

    await act(async () => {
      deleteButton.click();
    });

    expect(window.alert).toHaveBeenCalledWith('Delete failed');
  });
});
