import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      if (url.includes('/api/questions/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.reject(new Error('not found'));
    });

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
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();

    // Switch to Builder
    const builderTabs = await screen.findAllByRole('button', { name: /Spec Builder/i });
    await user.click(builderTabs[0]);
    expect(await screen.findByText(/Teacher Tools/i)).toBeInTheDocument();

    // Switch to Analytics
    const analyticsTabs = await screen.findAllByRole('button', { name: /Analytics/i });
    // In TrainerPanel, there's another "Cohort Analytics" button, so we might have multiple matches.
    // We want to click the main dashboard tab, which is the first one.
    await user.click(analyticsTabs[0]);

    expect(await screen.findByText(/Avg. Score/i)).toBeInTheDocument();
  });

  it('deletes a question when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Make sure we are on the overview tab first. Tab switching test might leave it elsewhere if tests aren't isolated properly,
    // though beforeEach should clear state. Just to be safe:
    const overviewTabs = await screen.findAllByRole('button', { name: /Overview/i });
    await user.click(overviewTabs[0]);

    const questionText = await screen.findByText('Modern Frontend Fundamentals Question 1');
    expect(questionText).toBeInTheDocument();

    await waitFor(() => {
      const deleteButton = document.querySelector('button[title="Delete question"]');
      if (deleteButton) {
        act(() => {
          deleteButton.click();
        });
      } else {
        throw new Error("Delete button not found yet");
      }
    });

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
