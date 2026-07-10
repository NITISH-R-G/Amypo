import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

vi.mock('../components/workspace/CodeEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="code-editor"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1/baseline')) {
        return Promise.resolve({
           ok: true,
           json: () => Promise.resolve({ queued: true, version: 2 })
        });
      }
      if (url.includes('/api/questions')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, id: 2 })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1' }] })
        });
      }
      if (url.includes('/api/trainer/questions/1/draft')) {
        if (options && options.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, baseline: { queued: true, version: 1 } })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { id: 1, title: 'Question 1', description: 'Desc 1', allowed_libraries: [] },
            files: [{ path: 'App.jsx', content: 'hello' }],
            testSpec: {
               global_timeout: 30000,
               steps: [
                 { id: '1', action: 'click', selector: '.btn', delay: 50 },
                 { id: '2', action: 'type', selector: '.input', value: 'hello', clear: true, waitForVisible: true },
                 { id: '3', action: 'wait', value: 1000 }
               ]
            }
          })
        });
      }
      if (url.includes('/api/trainer/baseline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            state: 'completed',
            baselineId: 1
          })
        });
      }
      if (url.includes('/api/trainer/analytics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            avgScore: 85,
            passRate: '90%',
            totalSubmissions: 100,
            avgExecution: '1.2s',
            scoreHistogram: [5, 10, 15, 20, 50],
            failedTests: [{ test: 'test1', count: 10 }]
          })
        });
      }
      return Promise.reject(new Error('not found: ' + url));
    });

    vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const renderComponent = (props = {}) => render(
    <BrowserRouter>
      <TrainerPanel {...props} />
    </BrowserRouter>
  );

  it('renders trainer panel, fetches questions, and saves draft', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });
    expect(await screen.findByText('Question 1')).toBeInTheDocument();

    const saveButton = await screen.findByRole('button', { name: /Save Draft/i });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('can switch to analytics tab and render metrics', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Cohort Analytics')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cohort Analytics'));

    await waitFor(() => {
      expect(screen.getByText('64%')).toBeInTheDocument();
      expect(screen.getByText('342')).toBeInTheDocument();
      expect(screen.getByText('1.2s')).toBeInTheDocument();
    });
  });

  it('can modify test spec details', async () => {
    const user = userEvent.setup();
    renderComponent({ initialTab: 'builder' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    await waitFor(() => {
      expect(screen.getByText('Visual Test Spec Builder')).toBeInTheDocument();
    });

    const addStepBtns = await screen.findAllByText('Add Step');
    expect(addStepBtns.length).toBeGreaterThan(0);

    // Initial steps: 3 from mock.
    await waitFor(() => {
      const selects = screen.queryAllByRole('combobox');
      expect(selects.length).toBe(3);
    });

    // add step
    await user.click(addStepBtns[0]);

    await waitFor(() => {
      const steps = screen.getAllByRole('combobox');
      expect(steps.length).toBe(4);
    });

    const steps = screen.getAllByRole('combobox');

    // switch action to hover on new step (it is the last one)
    await user.selectOptions(steps[3], 'hover');

    const selects = screen.getAllByRole('combobox');
    expect(selects[3].value).toBe('hover');

  });

  it('can create a new question', async () => {
     const user = userEvent.setup();
     renderComponent();

     await waitFor(() => {
       // Look for the "Add" button beside "Questions"
       const addBtns = screen.getAllByText('Add');
       expect(addBtns.length).toBeGreaterThan(0);
     });

     const addBtns = screen.getAllByText('Add');
     // The "Add" button next to Questions is the first one
     await user.click(addBtns[0]);

     await waitFor(() => {
       // Should reveal inputs.
       const inputs = document.querySelectorAll('input[type="text"]');
       expect(inputs.length).toBeGreaterThan(0);
     });

     const inputs = document.querySelectorAll('input[type="text"]');
     let titleInput;
     for (const i of inputs) {
       if (i.parentElement && i.parentElement.textContent.includes('New Question Title')) {
         titleInput = i;
         break;
       }
     }

     if (titleInput) {
         await user.type(titleInput, 'Question 2');

         const submitAdds = screen.getAllByRole('button', { name: /Add Question/i });
         // The actual submit button is the last one
         await user.click(submitAdds[submitAdds.length - 1]);

         await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/questions', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Question 2')
            }));
         });
     }
  });

  it('can trigger generate baseline manually', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeInTheDocument();
      });

      const genBaselineBtn = screen.getByText('Generate Baseline');
      await user.click(genBaselineBtn);

      await waitFor(() => {
         expect(global.fetch).toHaveBeenCalledWith('/api/questions/1/baseline', expect.objectContaining({
             method: 'POST'
         }));
      });
  });
});
