import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    HTMLCanvasElement.prototype.getContext = () => {};
    vi.mock('react-chartjs-2', () => ({
      Bar: () => null,
      Doughnut: () => null,
    }));
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/questions/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
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

  it('handles question deletion', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });

    confirmSpy.mockRestore();
  });

  it('navigates between tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);

    // Expect trainer panel to be rendered since it's embedded
    expect(await screen.findByText(/Visual Test Spec Builder/i)).toBeInTheDocument();

    const analyticsTabs = screen.getAllByRole('button', { name: /Analytics/i });
    await user.click(analyticsTabs[0]);

    // Expect trainer panel embedded with analytics tab active
    expect(await screen.findByText(/Cohort Score Distribution/i)).toBeInTheDocument();

    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    expect(await screen.findByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });
});
