import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

// Completely mock react-chartjs-2 to avoid canvas issues
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the ResizeObserver for Chart.js which is used in TrainerPanel
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }, { id: 2, title: 'Question to Delete' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
        });
      }
      if (url.includes('/api/questions/2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
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

    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/2 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('allows deleting a question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteButtons = await screen.findAllByTitle('Delete question');
    // Click delete on the second question (Question to Delete)

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(vi.fn(() => true));

    await user.click(deleteButtons[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/2', expect.objectContaining({ method: 'DELETE' }));
    });

    // Verify question 2 is removed
    expect(screen.queryByText('Question to Delete')).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('changes tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Spec Builder/i })).toBeInTheDocument();
    });

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);

    // The embedded TrainerPanel should now be shown.
    await waitFor(() => {
      expect(screen.getByText(/Teacher Tools/i)).toBeInTheDocument();
    });

    // We have two Analytics buttons now, one in the Teacher Dashboard header, and one in TrainerPanel.
    // We should use getAllByRole and click the first one which is the teacher dashboard one.
    const analyticsTabs = screen.getAllByRole('button', { name: /Analytics/i });
    await user.click(analyticsTabs[0]); // TeacherDashboard tab

    await waitFor(() => {
      expect(screen.getByText(/Teacher Tools/i)).toBeInTheDocument();
    });
  });
});
