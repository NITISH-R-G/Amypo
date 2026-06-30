import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

import userEvent from '@testing-library/user-event';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

describe('TeacherDashboard', () => {
  let mockConfirm;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1') && options && options.method === 'DELETE') {
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

  afterEach(() => {
    mockConfirm.mockRestore();
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

  it('allows switching between tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Overview should be selected by default, and we shouldn't have duplicate tabs unless
    // TeacherDashboard renders TrainerPanel.
    // Spec Builder might be in the list multiple times due to embedded TrainerPanel
    const builderTabs = screen.getAllByRole('button', { name: /Spec Builder/i });
    await user.click(builderTabs[0]); // Click the first one on TeacherDashboard

    const analyticsTabs = screen.getAllByRole('button', { name: /Analytics/i });
    await user.click(analyticsTabs[0]); // Click the first one on TeacherDashboard

    const overviewTabs = screen.getAllByRole('button', { name: /Overview/i });
    await user.click(overviewTabs[0]); // Click the first one on TeacherDashboard

    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });

  it('handles question deletion', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // We must be in Overview tab for the delete button to show
    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    const deleteBtn = await screen.findByTitle('Delete question');
    await user.click(deleteBtn);

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });

    await waitFor(() => {
       expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });
  });

  it('cancels question deletion', async () => {
    mockConfirm.mockImplementationOnce(() => false);
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // We must be in Overview tab for the delete button to show
    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    const deleteBtn = await screen.findByTitle('Delete question');
    await user.click(deleteBtn);

    expect(mockConfirm).toHaveBeenCalled();
    // Fetch DELETE should NOT be called
    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));

    // Question should still be there
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
  });

});
