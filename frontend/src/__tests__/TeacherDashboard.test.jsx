import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

import userEvent from '@testing-library/user-event';

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null }));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn();
    global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
    global.fetch = vi.fn((url, options) => {
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
      if (url.includes('/api/questions/1')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
      }
      return Promise.reject(new Error('not found'));
    });
  });

  const renderComponent = (initialEntries = ['/']) => render(
    <BrowserRouter initialEntries={initialEntries}>
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

  it('can switch tabs to Spec Builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    const builderTabBtn = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTabBtn);

    // After switching, the TrainerPanel should appear.
    // The exact text "Trainer Dashboard" is replaced by "Teacher Tools" due to embedded prop
    // Wait for that or simply rely on "Content Builder" which TrainerPanel renders.
    expect(await screen.findByText('Content Builder')).toBeInTheDocument();
  });

  it('can switch tabs to Analytics', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    // Use a specific query to find the button inside the layout
    const analyticsTabBtns = screen.getAllByRole('button', { name: /Analytics/i });
    // First button is likely the main tab switch, second one inside TrainerPanel. Let's take the first one.
    await user.click(analyticsTabBtns[0]);

    // After clicking analytics, it should show TrainerPanel with the analytics default tab
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();
  });

  it('can delete a question', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true); // User says YES

    // Reset initial entries to ensure it lands on overview tab
    renderComponent(['/teacher']);

    // We must wait for the component to render the fetched data.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

    // Switch to Overview tab explicitly just in case
    const overviewTabBtn = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTabBtn);

    // The question should be visible in the overview table.
    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    const deleteBtn = document.querySelector('button[title="Delete question"]');
    // For elements selected via querySelector (which may bypass pointer capture issues), use fireEvent or a direct click.
    deleteBtn.click();

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });

    await waitFor(() => {
        expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    // It should just log the error and remove the loading spinner.
    // We check if "Teacher Portal" renders despite the error.
    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.queryByText('Modern Frontend Fundamentals')).not.toBeInTheDocument();
  });
});
