import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
}));

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor" />
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window.alert = vi.fn();
    if (global.window && global.window.HTMLElement) {
      global.window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    global.fetch = vi.fn((url, options) => {
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

  it('navigates between overview, spec builder, and analytics tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    const specBuilderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(specBuilderTab);

    // Spec builder embeds TrainerPanel, which has text
    expect(await screen.findByText(/Generate Baseline/i)).toBeInTheDocument();

    const analyticsTabs = screen.getAllByRole('button', { name: /Analytics/i });
    const analyticsTab = analyticsTabs.find(btn => btn.textContent.includes("Analytics") && !btn.textContent.includes("Cohort"));
    if (!analyticsTab) throw new Error("Analytics tab not found");
    await user.click(analyticsTab);

    // Analytics tab has specific text
    expect(await screen.findByText(/Cohort Score Distribution/i)).toBeInTheDocument();

    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
  });

  it('deletes a question when confirmed', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Delete Question 1'));
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });

    // UI should update to remove the question
    expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
  });
});
