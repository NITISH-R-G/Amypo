import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
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

  it('handles navigation via tabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = screen.getByText(/Spec Builder/);
    const analyticsTab = screen.getByText(/Analytics/);
    const overviewTab = screen.getByText(/Overview/);

    expect(builderTab).toBeInTheDocument();
    expect(analyticsTab).toBeInTheDocument();
    expect(overviewTab).toBeInTheDocument();

    act(() => {
      builderTab.click();
    });
    expect(screen.getByText(/Teacher Tools/)).toBeInTheDocument(); // The trainer panel

    act(() => {
      analyticsTab.click();
    });
    // the trainer panel has an analytics view
    // Since it's embedded TrainerPanel, just checking it exists

    act(() => {
      overviewTab.click();
    });
    expect(screen.getByText(/Manage your curriculum/)).toBeInTheDocument();
  });

  it('handles deleting a question', async () => {
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    // Create new fetch mock for delete
    global.fetch.mockImplementation((url, options) => {
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
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Must be in overview tab to see delete button
    const overviewTab = screen.getByText(/Overview/);
    act(() => {
      overviewTab.click();
    });

    const deleteBtn = await screen.findByTitle('Delete question');
    act(() => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
    });

    // Confirm modal was called
    expect(window.confirm).toHaveBeenCalled();
  });

  it('handles delete failure gracefully', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Delete failed backend' })
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
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const overviewTab = screen.getByText(/Overview/);
    act(() => {
      overviewTab.click();
    });

    const deleteBtn = await screen.findByTitle('Delete question');
    act(() => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Delete failed backend');
    });
  });

  it('handles missing questions data format', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: true })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: true })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Fallbacks to empty questions and submissions
    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    // 0 Questions, 0 Students
    expect(screen.getByText(/0 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/0 Students Enrolled/)).toBeInTheDocument();
  });

  it('handles delete fetch error directly', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.reject(new Error('Network disconnected'));
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
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const overviewTab = screen.getByText(/Overview/);
    act(() => {
      overviewTab.click();
    });

    const deleteBtn = await screen.findByTitle('Delete question');
    act(() => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Network disconnected');
    });
  });

  it('aborts delete when window.confirm is false', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);

    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const overviewTab = screen.getByText(/Overview/);
    act(() => {
      overviewTab.click();
    });

    const deleteBtn = await screen.findByTitle('Delete question');

    global.fetch.mockClear();
    act(() => {
      deleteBtn.click();
    });

    // Fetch should not have been called for DELETE
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('navigates when add module button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const addModuleBtn = screen.getByTitle('Create a new question');
    act(() => {
      addModuleBtn.click();
    });
  });

  it('navigates when course settings button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const settingsBtn = screen.getByTitle('Course settings');
    act(() => {
      settingsBtn.click();
    });
  });

  it('navigates when edit button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // the header edit button (Create Question)
    const headerEditBtn = screen.getByText(/Create Question/);
    act(() => {
      headerEditBtn.click();
    });
  });
});
