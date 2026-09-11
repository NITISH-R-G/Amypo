import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock chart components since they break in JSDOM due to canvas issues
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}));

describe('TeacherDashboard', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/api/questions')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        questions: [
                            {
                                id: 1,
                                title: 'Build a Button',
                                difficulty: 'Beginner'
                            }
                        ]
                    })
                });
            }
             if (url.includes('/api/submissions')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        {
                            id: 1,
                            user_id: 'student-1',
                            question_id: 1,
                            score: 95,
                            status: 'passed',
                            created_at: new Date().toISOString()
                        }
                    ])
                });
            }
            return Promise.reject(new Error('Unknown URL: ' + url));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders dashboard metrics and fetches data', async () => {
        render(
            <BrowserRouter>
                <TeacherDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
             expect(screen.getByText('Build a Button')).toBeInTheDocument();
        });
    });

    it('handles errors when fetching courses', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
        render(
            <BrowserRouter>
                <TeacherDashboard />
            </BrowserRouter>
        );

        // Let's assume it logs error to console and loading goes away
        // Let's check for 0 total questions since it failed to load
        await waitFor(() => {
             expect(screen.queryByText('Build a Button')).not.toBeInTheDocument();
        });

        console.error.mockRestore();
    });

    it('switches between tabs', async () => {
         render(
            <BrowserRouter>
                <TeacherDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
             expect(screen.getByText('Build a Button')).toBeInTheDocument();
        });

        // Click on Spec Builder
        await act(async () => {
             fireEvent.click(screen.getByText('Spec Builder'));
        });

        // It renders TrainerPanel which has 'Teacher Tools' title
        await waitFor(() => {
             expect(screen.getByText('Teacher Tools')).toBeInTheDocument();
        });

        // Click on Analytics
        await act(async () => {
             fireEvent.click(screen.getByText('Analytics'));
        });

        // Analytics has some metrics
        await waitFor(() => {
             expect(screen.getByText('Cohort Analytics')).toBeInTheDocument();
        });
    });
});
