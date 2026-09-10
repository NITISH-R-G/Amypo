import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter, useNavigate } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  const navigateMock = vi.fn();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('TeacherDashboard', () => {
  let navigateMock;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Grab the mock instance from the mocked module
    const router = await import('react-router-dom');
    navigateMock = router.useNavigate();

    global.fetch = vi.fn((url) => {
      if (url === '/api/questions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }] })
        });
      }
      if (url === '/api/submissions?limit=200') {
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

  it('switches tabs and triggers navigation on buttons', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Tab Switching
    const builderTab = screen.getByText(/Spec Builder/i);
    const analyticsTab = screen.getByText(/Analytics/i);
    const overviewTab = screen.getByText(/Overview/i);

    await user.click(builderTab);
    expect(screen.queryByText('Modern Frontend Fundamentals')).not.toBeInTheDocument();

    await user.click(analyticsTab);
    expect(screen.queryByText('Modern Frontend Fundamentals')).not.toBeInTheDocument();

    await user.click(overviewTab);
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();

    // Navigation buttons
    const createQuestionBtn = screen.getByText(/Create Question/i);
    await user.click(createQuestionBtn);
    expect(navigateMock).toHaveBeenCalledWith('/teacher/editor');

    const addModuleBtn = screen.getByText(/Add Module to Course/i);
    await user.click(addModuleBtn);
    expect(navigateMock).toHaveBeenCalledWith('/teacher/editor');
  });
});
