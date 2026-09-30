import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

// Mock window.confirm
vi.spyOn(window, 'confirm').mockImplementation(() => true);

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

  it('navigates through tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(await screen.findByText('Modern Frontend Fundamentals')).toBeInTheDocument();

    const specBuilderTab = await screen.findByRole('button', { name: /Spec Builder/i });
    await user.click(specBuilderTab);

    // We expect TrainerPanel content to render for Spec Builder
    expect(await screen.findByText('Visual Test Spec Builder')).toBeInTheDocument();

    const allAnalyticsTabs = await screen.findAllByRole('button', { name: /Analytics/i });
    const analyticsTab = allAnalyticsTabs[0]; // The top level one
    await user.click(analyticsTab);

    // We expect TrainerPanel Analytics content to render
    expect(await screen.findByText('Cohort Score Distribution')).toBeInTheDocument();

    const overviewTab = await screen.findByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    expect(await screen.findByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });

  it('can delete a question', async () => {
    const user = userEvent.setup();

    // Mock the delete fetch
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question To Delete' }] })
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

    expect(await screen.findByText('Question To Delete')).toBeInTheDocument();

    const deleteBtn = await screen.findByTitle('Delete question');
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText('Question To Delete')).not.toBeInTheDocument();
    });
  });
});
