vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div data-testid="trainer-panel-mock">TrainerPanel</div>
}));
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

describe('TeacherDashboard', () => {
  const renderComponent = () => render(
    <BrowserRouter>
      <TeacherDashboard />
    </BrowserRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/questions')) {
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
  });

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

  it('renders loading state initially', async () => {
    let container;
    act(() => {
      container = renderComponent().container;
    });
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // Wait for data load to prevent state updates outside act
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
  });

  it('navigates to settings and editor correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const editBtn = screen.getByRole('button', { name: /Course settings/i });
    expect(editBtn).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete question');
    expect(deleteBtn).toBeInTheDocument();
  });

  it('handles delete question', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Deleted' })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getByTitle('Delete question');

    await act(async () => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
    });
  });

  it('handles delete question failure', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Delete failed' })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getByTitle('Delete question');

    await act(async () => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
    });
    expect(window.alert).toHaveBeenCalledWith('Delete failed');
  });

  it('does not delete question if user cancels', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getByTitle('Delete question');

    await act(async () => {
      deleteBtn.click();
    });

    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
  });

  it('handles empty questions list and error fetching', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockImplementation(() => {
      return Promise.reject(new Error('Network Error'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Check elements after loading
    expect(screen.getByText(/Teacher Portal/)).toBeInTheDocument();
  });

  it('can switch tabs to builder and analytics', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderBtn = screen.getByRole('button', { name: /Spec Builder/i });
    const analyticsBtn = screen.getByRole('button', { name: /Analytics/i });
    const overviewBtn = screen.getByRole('button', { name: /Overview/i });

    await act(async () => {
      builderBtn.click();
    });

    await act(async () => {
      analyticsBtn.click();
    });

    await act(async () => {
      overviewBtn.click();
    });
  });
});
