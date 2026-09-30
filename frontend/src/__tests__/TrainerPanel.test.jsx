import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainerPanel from '../pages/TrainerPanel';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

// Provide minimal mock for Monaco editor to prevent it from crashing in JSDOM
vi.mock('../components/workspace/CodeEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor-mock"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

// Mock URL.createObjectURL to avoid JSDOM errors when downloading blobs
global.URL.createObjectURL = vi.fn(() => 'mocked-url');

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock useToast from UI components so we don't need actual Toaster context in this isolated test
vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe('TrainerPanel', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        });
    });

    it('renders trainer panel, fetches questions, and saves draft', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/questions') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1', language: 'javascript' }] })
                });
            }
            if (url === '/api/trainer/questions/1/draft') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        question_id: 1,
                        spec_json: { tests: { dom: [], css: [], interactions: [] } }
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        render(<TrainerPanel />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        // Click the question to load its draft
        fireEvent.click(screen.getByText('Question 1'));

        // Switch to Spec Builder to save draft
        const specBuilderTab = await screen.findByText('Content Builder');
        fireEvent.click(specBuilderTab);

        // Mock draft save API
        global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) }));

        const saveButton = await screen.findByText('Save Draft');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft', expect.any(Object));
        });
    });

    it('creates a new test case via the UI (DOM Test)', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/questions') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ questions: [{ id: 1, title: 'Question 1', description: 'Desc 1', language: 'javascript' }] })
                });
            }
            if (url === '/api/trainer/questions/1/draft') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        question_id: 1,
                        spec_json: { tests: { dom: [], css: [], interactions: [] } }
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });

        render(<TrainerPanel activeTab="builder" />);

        await waitFor(() => {
            expect(screen.getByText('Question 1')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText('Question 1'));

        // Wait for it to become selected and fetch draft...
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/trainer/questions/1/draft'));

        const specBuilderTab = await screen.findByText('Content Builder');
        await userEvent.click(specBuilderTab);

        const addTestButton = await screen.findByText('Add Assertion');
        await userEvent.click(addTestButton);

        // When a new assertion is added, the class text 'DOM Assertion' appears
        await waitFor(() => {
            expect(screen.getAllByText('DOM Assertion').length).toBeGreaterThan(0);
        });
    });
});
