import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));

vi.mock('../pages/TrainerPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="trainer-panel-mock">Trainer Panel Mock</div>
}));

describe('TeacherDashboard', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        });
    });

    it('renders the dashboard and switches tabs', async () => {
        render(
            <BrowserRouter>
                <TeacherDashboard />
            </BrowserRouter>
        );
        expect(screen.getByText('Teacher Portal')).toBeInTheDocument();

        const specBuilderTab = screen.getByText('Spec Builder');
        expect(specBuilderTab).toBeInTheDocument();

        await userEvent.click(specBuilderTab);

        await waitFor(() => {
            expect(screen.getByTestId('trainer-panel-mock')).toBeInTheDocument();
        });
    });
});
