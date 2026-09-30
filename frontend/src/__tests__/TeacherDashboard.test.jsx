import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div data-testid="trainer-panel" />
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
      if (url.includes('/api/questions/1') && url.endsWith('1')) {
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

  it('deletes a question when confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteButton = await screen.findByTitle('Delete question');
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });

    confirmSpy.mockRestore();
  });

  it('does not delete a question when canceled', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteButton = await screen.findByTitle('Delete question');
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');
    // Ensure fetch was not called for DELETE
    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
      method: 'DELETE'
    }));

    confirmSpy.mockRestore();
  });

  it('changes tabs and renders mocked TrainerPanel', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const specBuilderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(specBuilderTab);

    expect(await screen.findByTestId('trainer-panel')).toBeInTheDocument();

    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);

    expect(await screen.findByTestId('trainer-panel')).toBeInTheDocument();
  });
});
