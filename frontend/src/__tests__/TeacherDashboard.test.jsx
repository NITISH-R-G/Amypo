import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid={`trainer-panel-${initialTab}`}>TrainerPanel Mock - {initialTab}</div>
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question Title 1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
        });
      }
      if (url.includes('/api/trainer/questions/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 1, title: 'Trainer Question', description: 'desc', allowed_libraries: [] },
            files: [], testSpec: {}
          })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    // Mock window.confirm
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
    expect(screen.getByText('Question Title 1')).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('can switch to the Builder tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Teacher Portal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Spec Builder'));

    // Wait for Builder view (TrainerPanel embedded)
    await waitFor(() => {
      expect(screen.getByTestId('trainer-panel-builder')).toBeInTheDocument();
    });
  });

  it('can switch to the Analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Teacher Portal')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Analytics'));

    // Wait for Analytics view
    await waitFor(() => {
      expect(screen.getByTestId('trainer-panel-analytics')).toBeInTheDocument();
    });
  });

  it('deletes a question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      // make sure overview is visible
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
    const overviewBtn = screen.getByText('Overview');
    await user.click(overviewBtn);

    // Wait until course load is complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?limit=200');
    });

    // Wait for Question title to show up in overview table
    await waitFor(() => {
      expect(screen.getByText('Question Title 1')).toBeInTheDocument();
    });

    const deleteBtn = await screen.findByTitle('Delete question');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });

    await waitFor(() => {
       expect(screen.queryByText('Question Title 1')).not.toBeInTheDocument();
    });
  });

  it('navigates to create question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Teacher Portal')).toBeInTheDocument();
    });

    const createBtns = screen.getAllByText(/Create Question/i);
    await user.click(createBtns[0]);
  });
});
