import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter, useNavigate } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="trainer-panel">Trainer Panel Mock</div>
}));

// Mock react-router-dom to check navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // We mock window.confirm since it's used for deletions
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
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
      return Promise.reject(new Error('not found: ' + url));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('switches to builder and analytics tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Overview should be default
    expect(screen.queryByTestId('trainer-panel')).not.toBeInTheDocument();

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);

    // With our mock, it should render Trainer Panel Mock
    expect(await screen.findByTestId('trainer-panel')).toBeInTheDocument();

    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);

    expect(await screen.findByTestId('trainer-panel')).toBeInTheDocument();
  });

  it('deletes a question', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    // Switch to Overview tab to ensure list is visible
    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);

    const deleteBtn = await screen.findByTitle('Delete question');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  it('navigates to create question', async () => {
    const user = userEvent.setup();
    renderComponent();

    const createBtn = await screen.findByRole('button', { name: /Create Question/i });
    await user.click(createBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/teacher/editor');
  });
});
