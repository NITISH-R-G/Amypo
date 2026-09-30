import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid={`trainer-panel-mock-${initialTab}`}>Trainer Panel Mock ({initialTab})</div>
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

  const renderComponent = (initialEntries = ['/']) => render(
    <MemoryRouter initialEntries={initialEntries}>
      <TeacherDashboard />
    </MemoryRouter>
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

  it('navigates to course builder tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const builderTab = await screen.findByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);

    expect(await screen.findByTestId('trainer-panel-mock-builder')).toBeInTheDocument();
  });

  it('navigates to analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const analyticsTab = await screen.findByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);

    expect(await screen.findByTestId('trainer-panel-mock-analytics')).toBeInTheDocument();
  });
});
