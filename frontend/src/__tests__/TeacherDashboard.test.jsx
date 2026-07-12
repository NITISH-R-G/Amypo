import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid={`trainer-panel-${initialTab}`} />
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options && options.method === 'DELETE') {
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

    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
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

  it('switches tabs to builder', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
     });

     const builderTabBtn = screen.getByRole('button', { name: /Spec Builder/i });
     await user.click(builderTabBtn);

     expect(await screen.findByTestId('trainer-panel-builder')).toBeInTheDocument();
  });

  it('switches tabs to analytics', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
     });

     const analyticsTabBtn = screen.getByRole('button', { name: /Analytics/i });
     await user.click(analyticsTabBtn);

     expect(await screen.findByTestId('trainer-panel-analytics')).toBeInTheDocument();
  });

  it('deletes a question', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions');
     });

     // ensure we are on the overview tab so questions list is rendered
     const overviewBtn = screen.getByRole('button', { name: /Overview/i });
     await user.click(overviewBtn);

     expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

     const deleteBtn = screen.getByRole('button', { name: /Delete question/i });
     await user.click(deleteBtn);

     expect(window.confirm).toHaveBeenCalled();
     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
     });

     expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
  });
});
