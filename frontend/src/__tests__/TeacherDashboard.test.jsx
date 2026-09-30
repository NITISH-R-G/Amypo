import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mock the TrainerPanel and nested components that might cause issues in JSDOM
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}));

// Mock ResizeObserver for react-chartjs-2
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

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

  it('navigates to Spec Builder tab correctly', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const specBuilderTab = await screen.findByRole('button', { name: /Spec Builder/i });
    await user.click(specBuilderTab);

    expect(await screen.findByText(/Visual Test Spec Builder/i)).toBeInTheDocument();
  });

  it('allows deleting a question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

    // Wait for the overview tab to be active
    const overviewTab = await screen.findByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    // Using query selector as title query might fail depending on JSDOM implementation
    const deleteButton = document.querySelector('button[title="Delete question"]');
    expect(deleteButton).toBeInTheDocument();

    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });

    // Verify question is removed from the list
    expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
  });
});
