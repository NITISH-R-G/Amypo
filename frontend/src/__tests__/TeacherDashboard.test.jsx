import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    window.IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/questions/1')) {
         if (global.mockDeleteFail) {
            return Promise.resolve({
              ok: false,
              json: () => Promise.resolve({ error: 'Delete failed mock' })
            });
         }
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
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const renderComponent = (initialEntries = ['/teacher']) => render(
    <MemoryRouter initialEntries={initialEntries}>
       <Routes>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/editor" element={<div data-testid="mock-editor">Mock Editor</div>} />
          <Route path="/teacher/editor/:id" element={<div data-testid="mock-editor">Mock Editor with ID</div>} />
          <Route path="/settings" element={<div data-testid="mock-settings">Mock Settings</div>} />
       </Routes>
    </MemoryRouter>
  );

  it('renders the teacher dashboard and fetches course data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?limit=200');
    });

    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('navigates to different tabs', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument());

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await act(async () => { await user.click(builderTab); });

    // Check if the URL changed via our MemoryRouter setup is hard without location
    // But we can check that it rendered TrainerPanel based on text
    expect(builderTab).toHaveClass('bg-emerald-50');

    const analyticsTab = screen.getAllByRole('button', { name: /Analytics/i })[0];
    await act(async () => { await user.click(analyticsTab); });
    expect(analyticsTab).toHaveClass('bg-emerald-50');
  });

  it('handles question deletion', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument());

     const deleteBtn = screen.getByTitle('Delete question');
     await act(async () => { await user.click(deleteBtn); });

     expect(window.confirm).toHaveBeenCalled();
     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
     });

     expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
  });

  it('handles question deletion failure', async () => {
     global.mockDeleteFail = true;
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument());

     const deleteBtn = screen.getByTitle('Delete question');
     await act(async () => { await user.click(deleteBtn); });

     await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Delete failed mock');
     });

     // The question should still be there
     expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
     delete global.mockDeleteFail;
  });

  it('navigates to question editor', async () => {
     const user = userEvent.setup();
     renderComponent();
     await waitFor(() => expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument());

     // Top Create Question button
     const createBtn = screen.getByRole('button', { name: /Create Question/i });
     await act(async () => { await user.click(createBtn); });
     expect(await screen.findByTestId('mock-editor')).toBeInTheDocument();
  });

});
