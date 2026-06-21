import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid="trainer-panel">Trainer Panel - {initialTab}</div>
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
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <TeacherDashboard />
    </BrowserRouter>
  );

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('switches tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);
    expect(screen.getByTestId('trainer-panel')).toHaveTextContent('Trainer Panel - builder');

    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);
    expect(screen.getByTestId('trainer-panel')).toHaveTextContent('Trainer Panel - analytics');

    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
  });

  it('deletes a question when confirmed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch.mockImplementationOnce((url) => {
        if (url.includes('/api/questions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }] })
          });
        }
    }).mockImplementationOnce((url) => {
        if (url.includes('/api/submissions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
          });
        }
    }).mockImplementationOnce((url, options) => {
        if (url.includes('/api/questions/1') && options.method === 'DELETE') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
        }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete question');
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');

    await waitFor(() => {
      expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });

  it('shows alert if deleting question fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch.mockImplementationOnce((url) => {
        if (url.includes('/api/questions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }] })
          });
        }
    }).mockImplementationOnce((url) => {
        if (url.includes('/api/submissions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
          });
        }
    }).mockImplementationOnce((url, options) => {
        if (url.includes('/api/questions/1') && options.method === 'DELETE') {
            return Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Cannot delete' })
            });
        }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete question');
    await user.click(deleteButton);

    await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Cannot delete');
    });

    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
  });
});
