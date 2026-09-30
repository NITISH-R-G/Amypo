import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock TrainerPanel
vi.mock('../pages/TrainerPanel', () => ({
  default: ({ embedded, initialTab }) => <div data-testid="mock-trainer-panel">{`TrainerPanel embedded=${embedded} tab=${initialTab}`}</div>
}));

// Mock react-chartjs-2 to prevent canvas errors if any
vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null }));

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

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    // Mock window.alert
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

  it('navigates to create question', async () => {
    renderComponent();
    await screen.findByText('Modern Frontend Fundamentals');
    const createBtn = screen.getByRole('button', { name: /Create Question/i });
    fireEvent.click(createBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/editor');

    const addModuleBtn = screen.getByRole('button', { name: /Add Module to Course/i });
    fireEvent.click(addModuleBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/editor');
  });

  it('navigates to settings', async () => {
    renderComponent();
    await screen.findByText('Modern Frontend Fundamentals');
    const settingsBtn = screen.getByTitle('Course settings');
    fireEvent.click(settingsBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('navigates to edit question', async () => {
    renderComponent();
    await screen.findByText('Modern Frontend Fundamentals');
    const editButtons = screen.getAllByRole('button').filter(b => b.className.includes('hover:text-emerald-600') && !b.title.includes('Course'));
    fireEvent.click(editButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/editor/1');
  });

  it('deletes a question when confirm is true', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] }) });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
    });

    renderComponent();
    await screen.findByText('Q1');
    const deleteBtn = screen.getByTitle('Delete question');
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
    });
    expect(screen.queryByText('Q1')).not.toBeInTheDocument();
  });

  it('does not delete question when confirm is false', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    renderComponent();
    await screen.findByText('Modern Frontend Fundamentals Question 1');
    const deleteBtn = screen.getByTitle('Delete question');
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', expect.anything());
  });

  it('handles delete question failure', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Cannot delete' }) });
      }
      if (url.includes('/api/questions')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] }) });
      if (url.includes('/api/submissions')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderComponent();
    await screen.findByText('Q1');
    const deleteBtn = screen.getByTitle('Delete question');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Cannot delete');
    });
  });

  it('switches tabs and renders embedded TrainerPanel', async () => {
    renderComponent();
    await screen.findByText('Modern Frontend Fundamentals');

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    fireEvent.click(builderTab);
    expect(screen.getByTestId('mock-trainer-panel')).toHaveTextContent('TrainerPanel embedded=true tab=builder');

    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    fireEvent.click(analyticsTab);
    expect(screen.getByTestId('mock-trainer-panel')).toHaveTextContent('TrainerPanel embedded=true tab=analytics');

    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    fireEvent.click(overviewTab);
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });

  it('handles fetch errors on mount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockImplementation(() => Promise.reject(new Error('Network error')));
    renderComponent();
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    console.error.mockRestore();
  });
});
