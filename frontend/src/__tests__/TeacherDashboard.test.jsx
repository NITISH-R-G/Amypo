import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid={`trainer-panel-${initialTab}`}>Trainer Panel Mock</div>
}));

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
      if (url.includes('/api/questions/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
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

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTabBtn = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTabBtn);
    expect(screen.getByTestId('trainer-panel-builder')).toBeInTheDocument();

    const analyticsTabBtn = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTabBtn);
    expect(screen.getByTestId('trainer-panel-analytics')).toBeInTheDocument();
  });

  it('deletes a question after user confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const overviewTabBtn = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTabBtn);

    const deleteBtn = await screen.findByTitle('Delete question');
    expect(deleteBtn).toBeInTheDocument();

    if (deleteBtn) {
      await user.click(deleteBtn);

      expect(window.confirm).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
          method: 'DELETE'
        }));
      });
    }
  });
});
