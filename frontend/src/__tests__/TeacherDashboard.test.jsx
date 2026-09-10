import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid="trainer-panel">Trainer Panel: {initialTab}</div>
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options?.method === 'DELETE') {
           return Promise.resolve({
             ok: true,
             json: () => Promise.resolve({ success: true })
           });
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

  it('switches to Spec Builder tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    // ensure we are on the Overview tab first to wait for loading to finish
    const overviewTab = await screen.findByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    });

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);

    expect(await screen.findByTestId('trainer-panel')).toHaveTextContent('Trainer Panel: builder');
  });

  it('switches to Analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const overviewTab = await screen.findByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    });

    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);

    expect(await screen.findByTestId('trainer-panel')).toHaveTextContent('Trainer Panel: analytics');
  });

  it('deletes a question', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Since earlier tests might have clicked to another tab, ensure we are on the Overview tab
    // Wait for the tab to be available and click it
    const overviewTab = await screen.findByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete question');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });

    await waitFor(() => {
        expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });
});
