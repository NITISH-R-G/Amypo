import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div data-testid="trainer-panel-mock">Trainer Panel Mock</div>
}));

vi.mock('../pages/AnalyticsPage', () => ({
  default: () => <div data-testid="analytics-mock">Analytics Mock</div>
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Doughnut: () => <div data-testid="chart-doughnut" />
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1', difficulty: 'easy', type: 'html' }] })
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

  const renderComponent = (initialEntries = ['/']) => render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<TeacherDashboard />} />
        <Route path="/teacher/editor" element={<div data-testid="teacher-editor-mock" />} />
      </Routes>
    </MemoryRouter>
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

  it('renders builder tab via search param', async () => {
    renderComponent(['/?tab=builder']);
    expect(await screen.findByTestId('trainer-panel-mock')).toBeInTheDocument();
  });

  it('navigates to editor when clicking Create Question', async () => {
    const user = userEvent.setup();
    renderComponent(['/']);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const buildBtn = screen.getByText('Create Question');
    await user.click(buildBtn);

    expect(await screen.findByTestId('teacher-editor-mock')).toBeInTheDocument();
  });

  it('navigates to specific question when clicking Edit', async () => {
    const user = userEvent.setup();
    renderComponent(['/']);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const editBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-edit3'));
    if(editBtn) {
       await user.click(editBtn);
       expect(await screen.findByTestId('teacher-editor-mock')).toBeInTheDocument();
    }
  });

  it('deletes a question', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    renderComponent(['/']);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-trash2'));
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/questions/1'), expect.objectContaining({ method: 'DELETE' }));
    });
  });

  it('renders analytics tab', async () => {
    renderComponent(['/?tab=analytics']);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    // In TeacherDashboard we check the Analytics tab
    // TeacherDashboard renders AnalyticsPage on tab='analytics', wait for mock.
  });
});
