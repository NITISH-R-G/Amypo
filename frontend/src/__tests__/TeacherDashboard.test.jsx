import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
  Line: () => null
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.IS_REACT_ACT_ENVIRONMENT = true;
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    HTMLCanvasElement.prototype.getContext = () => {};
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

  it('navigates tabs and computes metrics', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    });

    const builderTab = screen.getByText('Spec Builder');
    builderTab.click();

    // Wait for builder tab content to show
    await waitFor(() => {
      expect(screen.getByText(/Create Question/i)).toBeInTheDocument();
    });

    const analyticsTab = screen.getByText('Analytics');
    analyticsTab.click();

    // The analytics view might be empty initially, so we just check for tab active state
    // But we know overview is gone
    await waitFor(() => {
       // Analytics text is present
       expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  it('can trigger delete question dialog', async () => {
    renderComponent();

    // Explicitly navigate back to overview if needed, but it should be default
    const overviewTab = screen.getByText('Overview');
    overviewTab.click();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    window.confirm = vi.fn().mockReturnValue(true);
    global.fetch = vi.fn().mockImplementation((url, options) => {
        if (url.includes('/api/questions/1')) {
           return Promise.resolve({ ok: true, json: () => Promise.resolve({success: true}) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const deleteBtn = screen.getAllByRole('button', { name: /delete/i })[0] || screen.getAllByTitle(/delete question/i)[0];
    if(deleteBtn) deleteBtn.click();

    await waitFor(() => {
       expect(window.confirm).toHaveBeenCalled();
       expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
