import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid={`trainer-panel-${initialTab}`}>Mocked TrainerPanel: {initialTab}</div>
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

  it('deletes a question', async () => {
    const user = userEvent.setup();
    // Re-mock fetch to handle DELETE
    global.fetch.mockImplementation((url, options) => {
       if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
         return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
       }
       if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question to delete' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
       expect(screen.getByText('Question to delete')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');

    await waitFor(() => {
        expect(screen.queryByText('Question to delete')).not.toBeInTheDocument();
    });
  });

  it('switches tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    });

    const builderTab = screen.getByText(/Spec Builder/i);
    await user.click(builderTab);

    expect(await screen.findByTestId('trainer-panel-builder')).toBeInTheDocument();

    const analyticsTab = screen.getByText(/Analytics/i);
    await user.click(analyticsTab);

    expect(await screen.findByTestId('trainer-panel-analytics')).toBeInTheDocument();
  });
});
