import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options?.method === 'DELETE') {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
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
      // trainer panel mocks
      if (url.includes('/api/trainer/questions/1/draft')) {
         return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [] },
            files: [],
            testSpec: {}
          })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    global.confirm = vi.fn(() => true);
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
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('handles deleting a question', async () => {
      renderComponent();
      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const deleteBtn = await screen.findByTitle('Delete question');

      fireEvent.click(deleteBtn);

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
      });

      // Question should be removed from DOM
      expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
  });

  it('switches tabs', async () => {
      renderComponent();
      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const builderTab = screen.getByText('Spec Builder');
      fireEvent.click(builderTab);

      await screen.findByText(/Teacher Tools/i); // Header in TrainerPanel

      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
      // Wait for chart stuff
      await screen.findByText(/Teacher Tools/i);
  });
});
