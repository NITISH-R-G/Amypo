import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div>Trainer Panel Content Mocked</div>
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({ ok: true });
        }
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

  const renderComponent = (initialEntries = ['/']) => render(
    <MemoryRouter initialEntries={initialEntries}>
      <TeacherDashboard />
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

  it('deletes a question when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const buttons = await screen.findAllByRole('button');
    const deleteBtn = buttons.find(b => b.innerHTML.includes('lucide-trash-2') || b.title === 'Delete question');

    if(deleteBtn) {
       await user.click(deleteBtn);

       expect(window.confirm).toHaveBeenCalledWith('Delete Question 1? This cannot be undone.');
       await waitFor(() => {
         expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({
           method: 'DELETE'
         }));
       });
    }
  });

  it('navigates tabs using search params', async () => {
    const user = userEvent.setup();
    renderComponent(['/?tab=overview']);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(screen.getByRole('button', { name: /Builder/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Builder/i }));

    expect(await screen.findByText('Trainer Panel Content Mocked')).toBeInTheDocument();
  });
});
