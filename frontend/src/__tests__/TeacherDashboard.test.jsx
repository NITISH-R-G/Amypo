import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

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

  it('switches tabs', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const specBuilderTab = await screen.findByRole('button', { name: /Spec Builder/i });
    await user.click(specBuilderTab);
    expect(specBuilderTab).toBeInTheDocument();

    const analyticsTabButtons = await screen.findAllByRole('button');
    const analyticsTab = analyticsTabButtons.find(b => b.textContent?.includes('Analytics'));
    expect(analyticsTab).toBeDefined();
    await user.click(analyticsTab);
    expect(analyticsTab).toBeInTheDocument();

    const overviewTabButtons = await screen.findAllByRole('button');
    const overviewTab = overviewTabButtons.find(b => b.textContent?.includes('Overview'));
    expect(overviewTab).toBeDefined();
    await user.click(overviewTab);
    expect(await screen.findByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });

  it('deletes a question', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    // Mock delete fetch
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/api/questions') && options?.method === 'DELETE') {
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

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    const deleteButton = await screen.findByTitle('Delete question');

    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));

    confirmSpy.mockRestore();
  });
});
