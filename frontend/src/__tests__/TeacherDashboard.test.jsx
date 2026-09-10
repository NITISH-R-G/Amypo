import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();

// Initial search params state
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, (newParams) => {
        mockSetSearchParams(newParams);
        mockSearchParams = new URLSearchParams(newParams);
    }],
  };
});

vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div data-testid="mock-trainer-panel">Trainer Panel</div>
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
          if (options && options.method === 'DELETE' && url.includes('/1')) {
              return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true })
              });
          }
          if (options && options.method === 'DELETE' && url.includes('/999')) {
              return Promise.resolve({
                  ok: false,
                  json: () => Promise.resolve({ error: 'Cannot delete' })
              });
          }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [
              { id: 1, title: 'Modern Frontend Fundamentals Question 1' },
              { id: 999, title: 'Question to fail delete' }
          ] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
              { id: 1, question_id: 1, student_id: 1, total_score: 95 },
              { id: 2, question_id: 1, student_id: 2, total_score: 85 },
              { id: 3, question_id: 1, student_id: 1, total_score: 100 },
          ])
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <TeacherDashboard />
    </BrowserRouter>
  );

  it('renders the teacher dashboard, fetches course data, and interacts with tabs and buttons', async () => {
    const user = userEvent.setup();
    const { rerender } = renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?limit=200');
    });

    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/2 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/2 Students Enrolled/)).toBeInTheDocument();
    expect(screen.getByText(/Avg Score: 93/)).toBeInTheDocument();

    const settingsBtn = screen.getByLabelText('Course settings');
    await act(async () => {
        await user.click(settingsBtn);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/settings');

    const addModuleBtn = screen.getByTitle('Create a new question');
    await act(async () => {
        await user.click(addModuleBtn);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/editor');

    const builderTab = screen.getByText('Spec Builder');
    await act(async () => {
        await user.click(builderTab);
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'builder' });

    // Rerender to simulate URL change picking up new params from mockSearchParams
    rerender(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    expect(await screen.findByTestId('mock-trainer-panel')).toBeInTheDocument();

    const overviewTab = screen.getByText('Overview');
    await act(async () => {
        await user.click(overviewTab);
    });
    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'overview' });

    rerender(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    const analyticsTab = screen.getByText('Analytics');
    await act(async () => {
        await user.click(analyticsTab);
    });
    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'analytics' });

    rerender(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await act(async () => {
        await user.click(overviewTab);
    });

    rerender(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    const deleteBtns = screen.getAllByTitle('Delete question');
    await act(async () => {
        await user.click(deleteBtns[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));

    await waitFor(() => {
        expect(screen.queryByText('Modern Frontend Fundamentals Question 1')).not.toBeInTheDocument();
    });

    const failDeleteBtn = screen.getByTitle('Delete question');
    await act(async () => {
        await user.click(failDeleteBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/questions/999', expect.objectContaining({ method: 'DELETE' }));

    await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Cannot delete');
    });

  });
});
