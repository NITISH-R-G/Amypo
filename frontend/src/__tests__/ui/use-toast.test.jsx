import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useToast, toast, Toaster } from '../../components/ui/use-toast';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const TestComponent = () => {
    const { toast: hookToast, dismiss } = useToast();

    // Clear toast state on mount
    React.useEffect(() => {
        dismiss();
    }, []);

    return (
        <div>
            <button onClick={() => hookToast({ title: 'Hook Toast', description: 'desc' })}>Show Hook Toast</button>
            <button onClick={() => toast({ title: 'Global Toast', description: 'desc' })}>Show Global Toast</button>
            <button onClick={() => toast({ title: 'Toast 1' })}>T1</button>
            <button onClick={() => toast({ title: 'Toast 2' })}>T2</button>
            <button onClick={() => toast({ title: 'Toast 3' })}>T3</button>
            <button onClick={() => toast({ title: 'Toast 4' })}>T4</button>
            <button onClick={() => dismiss()}>Dismiss All</button>
        </div>
    );
};

describe('use-toast', () => {
    beforeEach(() => {
        window.IS_REACT_ACT_ENVIRONMENT = true;
    });

    it('renders and shows toasts', async () => {
        const user = userEvent.setup();
        render(
            <>
                <TestComponent />
                <Toaster />
            </>
        );

        await user.click(screen.getByText('Show Global Toast'));

        expect(await screen.findByText('Global Toast')).toBeInTheDocument();
        expect(screen.getByText('desc')).toBeInTheDocument();

        await user.click(screen.getByText('Dismiss All'));
        expect(screen.queryByText('Global Toast')).not.toBeInTheDocument();
    });
});
