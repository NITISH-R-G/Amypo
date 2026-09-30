import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid={`trainer-panel-${initialTab}`}>Mock Trainer Panel {initialTab}</div>
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

  it('navigates tabs and renders TrainerPanel when requested', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByText(/Spec Builder/i);
    const analyticsTab = await screen.findByRole('button', { name: /Analytics/i });

    // Click Builder
    await user.click(builderTab);
    expect(await screen.findByTestId('trainer-panel-builder')).toBeInTheDocument();

    // Click Analytics
    await user.click(analyticsTab);
    expect(await screen.findByTestId('trainer-panel-analytics')).toBeInTheDocument();
  });

  it('can delete a question after confirmation', async () => {
    const user = userEvent.setup();
    renderComponent();

    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Make sure we are in Overview tab where the list is rendered
    const overviewTab = screen.getByText(/Overview/i);
    await user.click(overviewTab);

    const deleteButton = await screen.findByTitle(/Delete question/i);

    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  it('can click add module button', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addModuleBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Add Module to Course') || b.textContent.includes('Create Question'));
    if (addModuleBtn) {
        await user.click(addModuleBtn);
    }
  });
});
