import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => (
    <div data-testid="trainer-panel">TrainerPanel: {initialTab}</div>
  )
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1') && options && options.method === 'DELETE') {
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

  it('navigates tabs', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderBtn = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderBtn);
    expect(await screen.findByText('TrainerPanel: builder')).toBeInTheDocument();

    const analyticsBtn = screen.getByRole('button', { name: /Analytics/i, exact: false });
    await user.click(analyticsBtn);
    expect(await screen.findByText('TrainerPanel: analytics')).toBeInTheDocument();

    const overviewBtn = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewBtn);
    expect(await screen.findByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });

  it('deletes a question', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle('Delete question');
    await user.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });

    expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
  });
});
