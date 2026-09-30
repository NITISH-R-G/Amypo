import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

// Global mocks for ResizeObserver and react-chartjs-2 to prevent Chart.js errors
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    window.IS_REACT_ACT_ENVIRONMENT = true;
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

  it('switches tabs to builder and analytics', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Using simple text queries to switch tabs
    const builderTab = await screen.findByText(/Spec Builder/i);
    expect(builderTab).toBeInTheDocument();

    // click builder tab
    await act(async () => {
      await user.click(builderTab);
    });

    // should render trainer panel which has 'Teacher Tools' text
    await waitFor(() => {
      expect(screen.getByText(/Teacher Tools/i)).toBeInTheDocument();
    });

    // we can check if overview stuff is gone
    await waitFor(() => {
      expect(screen.queryByText(/Add Module to Course/i)).not.toBeInTheDocument();
    });

    // using queryAllByText because 'Analytics' appears in both the tab and potentially inside TrainerPanel tabs
    const analyticsTabs = await screen.findAllByText(/Analytics/i);
    // Click the tab in the TeacherDashboard navigation
    const dashAnalyticsTab = analyticsTabs.find(el => el.tagName.toLowerCase() === 'button' && el.closest('div.flex.flex-wrap.gap-2.bg-white'));
    await act(async () => {
      if (dashAnalyticsTab) {
          await user.click(dashAnalyticsTab);
      } else {
          await user.click(analyticsTabs[0]);
      }
    });

    // wait for Analytics components to appear (e.g. from TrainerPanel initialTab="analytics")
    // TrainerPanel analytics tab renders 'Avg. Score'
    await waitFor(() => {
      expect(screen.getByText(/Avg. Score/i)).toBeInTheDocument();
    });
  });
});
