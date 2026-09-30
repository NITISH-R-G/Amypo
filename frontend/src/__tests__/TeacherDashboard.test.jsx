import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

// We need to mock TrainerPanel because it might make its own fetch calls
// and cause unexpected test timeouts or failures when embedded.
vi.mock('../pages/TrainerPanel', () => ({
  default: ({ embedded, initialTab }) => (
    <div data-testid={`trainer-panel-${initialTab}`}>
      {embedded ? 'Teacher Tools' : 'Trainer Dashboard'}
    </div>
  )
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    window.alert = vi.fn();

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

  it('switches tabs and renders TrainerPanel when embedded', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Switch to Spec Builder tab by text since role might be ambiguous if button has child SVGs
    const specBuilderBtns = await screen.findAllByText(/Spec Builder/i);
    // Use the first one
    await user.click(specBuilderBtns[0].closest('button') || specBuilderBtns[0]);

    // Spec builder embeds TrainerPanel, which we mocked
    expect(await screen.findByTestId('trainer-panel-builder')).toBeInTheDocument();
    expect(screen.getByText('Teacher Tools')).toBeInTheDocument();

    // Switch to Analytics tab
    const analyticsBtns = await screen.findAllByText(/Analytics/i);
    await user.click(analyticsBtns[0].closest('button') || analyticsBtns[0]);

    expect(await screen.findByTestId('trainer-panel-analytics')).toBeInTheDocument();

    // Switch back to Overview
    const overviewBtns = await screen.findAllByText(/Overview/i);
    await user.click(overviewBtns[0].closest('button') || overviewBtns[0]);

    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
  });

  it('deletes a question', async () => {
    const user = userEvent.setup();
    const { container } = renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    // Wait for the rows to render
    const deleteBtn = container.querySelector('button[title="Delete question"]');
    expect(deleteBtn).not.toBeNull();

    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
      method: 'DELETE'
    }));

    await waitFor(() => {
        expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });
});