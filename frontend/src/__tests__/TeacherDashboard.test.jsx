import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
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

  it('switches between tabs and simulates deleting a question', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Switch to Spec Builder tab
    const specBuilderBtn = await screen.findByRole('button', { name: /Spec Builder/i });
    fireEvent.click(specBuilderBtn);
    // Since TrainerPanel is embedded, we just check if it switched states or if fetch was called.

    // Switch to Analytics tab (which renders TrainerPanel's analytics)
    // The button might not have the role or accessible name we expect due to nesting or icons
    // Let's use findByText
    const analyticsBtn = await screen.findByText('Analytics');
    fireEvent.click(analyticsBtn);

    // Switch back to Overview
    const overviewBtn = await screen.findByText('Overview');
    fireEvent.click(overviewBtn);

    // Mock confirm and delete
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    const deleteBtn = await screen.findByTitle('Delete question');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
