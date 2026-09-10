import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mock TrainerPanel so it doesn't do its own fetches
vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid="mock-trainer-panel">{initialTab}</div>
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.fetch = vi.fn((url) => {
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
      expect(window.fetch).toHaveBeenCalledWith('/api/questions');
      expect(window.fetch).toHaveBeenCalledWith('/api/submissions?limit=200');
    });

    // Check elements after loading
    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('can delete a question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    window.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })); // /api/questions
    window.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })); // /api/submissions
    // Mock the delete fetch
    window.fetch.mockImplementationOnce((url, options) => {
      if (options && options.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.reject(new Error('unhandled mock request'));
    });

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });

  it('navigates tabs correctly', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    });

    const builderTabBtn = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTabBtn);

    expect(await screen.findByTestId('mock-trainer-panel')).toHaveTextContent('builder');

    const analyticsTabBtn = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTabBtn);

    expect(await screen.findByTestId('mock-trainer-panel')).toHaveTextContent('analytics');
  });
});
