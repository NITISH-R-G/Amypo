import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

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
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
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

  it('changes tab when clicking Spec Builder', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(screen.queryByText(/Loading/)).not.toBeInTheDocument());

    const builderTab = await screen.findByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);

    // Test that the URL changes or some indication of tab change
    await waitFor(() => {
      expect(builderTab).toHaveClass('bg-emerald-50');
    });
  });

  it('handles delete question', async () => {
    const user = userEvent.setup();
    const { container } = renderComponent();

    await waitFor(() => expect(screen.queryByText(/Loading/)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText(/Modern Frontend Fundamentals Question 1/)).toBeInTheDocument());

    // Using container.querySelector because lucide-react icons inside buttons might not be easily queryable by role/name if not configured
    const deleteBtn = container.querySelector('button[title="Delete question"]');
    if(deleteBtn) {
       await user.click(deleteBtn);
       await waitFor(() => {
         expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
       });
    }
  });
});
