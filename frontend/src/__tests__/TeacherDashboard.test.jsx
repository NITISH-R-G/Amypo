import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

describe('TeacherDashboard', () => {
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

  const renderComponent = () => render(
    <BrowserRouter>
      <TeacherDashboard />
    </BrowserRouter>
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

  it('deletes a question successfully', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    global.fetch.mockImplementation((url, options) => {
      if (options && options.method === 'DELETE' && url === '/api/questions/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question to delete' }] })
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTitle('Delete question')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete question');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
    });
  });

  it('handles delete question error', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    global.fetch.mockImplementation((url, options) => {
      if (options && options.method === 'DELETE' && url === '/api/questions/1') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Delete failed' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question to fail delete' }] })
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTitle('Delete question')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete question');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
      expect(window.alert).toHaveBeenCalledWith('Delete failed');
    });
  });
});
