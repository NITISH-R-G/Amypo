import { render, act, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, it, describe, beforeEach, vi, afterEach } from 'vitest';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import '@testing-library/jest-dom/vitest';
import * as React from 'react';

// Reset module state before each test
beforeEach(() => {
    // Clear toastListeners and memoryState
    if (dispatchForTest) {
      dispatchForTest({ type: "REMOVE_TOAST" });
    }
});

afterEach(() => {
    vi.useRealTimers();
});

const ToastWrapper = () => {
    const { toasts } = useToast();
    React.useEffect(() => {
        if (dispatchForTest) {
          dispatchForTest({ type: "REMOVE_TOAST" });
        }
    }, []);
    return <Toaster />;
}

describe('use-toast', () => {
    it('adds and displays a toast', async () => {
        render(<ToastWrapper />);
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({
                title: 'Test Toast',
                description: 'Test Description',
            });
        });

        expect(await screen.findByText('Test Toast')).toBeInTheDocument();
        expect(await screen.findByText('Test Description')).toBeInTheDocument();
    });

    it('dismisses a toast', async () => {
        render(<ToastWrapper />);
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({
                title: 'Test Toast 2',
            });
        });

        const toastElement = await screen.findByText('Test Toast 2');
        expect(toastElement).toBeInTheDocument();

        act(() => {
            result.current.dismiss(); // dismiss all
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    it('updates a toast', async () => {
        render(<ToastWrapper />);
        const { result } = renderHook(() => useToast());

        let toastObj;
        act(() => {
            toastObj = result.current.toast({
                title: 'Test Toast 3',
            });
        });

        const toastElement = await screen.findByText('Test Toast 3');
        expect(toastElement).toBeInTheDocument();

        act(() => {
            toastObj.update({
                id: toastObj.id,
                title: 'Test Toast 3 Updated'
            });
        });

        expect(await screen.findByText('Test Toast 3 Updated')).toBeInTheDocument();
    });

    it('removes a toast by id', async () => {
        render(<ToastWrapper />);
        const { result } = renderHook(() => useToast());

        let toastObj;
        act(() => {
            toastObj = result.current.toast({
                title: 'Test Toast 5',
            });
        });

        expect(await screen.findByText('Test Toast 5')).toBeInTheDocument();

        act(() => {
            if (dispatchForTest) {
                dispatchForTest({ type: "REMOVE_TOAST", toastId: toastObj.id });
            }
        });

        expect(screen.queryByText('Test Toast 5')).not.toBeInTheDocument();
    });

    it('dismisses a specific toast', async () => {
        render(<ToastWrapper />);
        const { result } = renderHook(() => useToast());

        let toastObj;
        act(() => {
            toastObj = result.current.toast({
                title: 'Test Toast 6',
            });
        });

        expect(await screen.findByText('Test Toast 6')).toBeInTheDocument();

        act(() => {
            result.current.dismiss(toastObj.id);
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    it('handles onOpenChange for toast', async () => {
        render(<ToastWrapper />);
        const { result } = renderHook(() => useToast());

        let toastObj;
        act(() => {
            toastObj = result.current.toast({
                title: 'Test Toast 7',
            });
        });

        const toastElement = await screen.findByText('Test Toast 7');
        expect(toastElement).toBeInTheDocument();

        // The toast close button logic should trigger onOpenChange
        const closeButton = toastElement.parentElement.parentElement.querySelector('button[toast-close=""]');
        expect(closeButton).not.toBeNull();

        act(() => {
           closeButton.click();
        });

        expect(result.current.toasts[0].open).toBe(false);
    });
});
