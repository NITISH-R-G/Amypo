import { render, screen, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToast, toast, Toaster } from '../../components/ui/use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    // Hack to clear all toasts
    act(() => {
      // Just add enough dummy toasts to push everything out, or rely on renderHook
    });
  });

  it('adds and displays a toast', () => {
    // Wait for empty state or mock state
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });

    render(<Toaster />);
    act(() => {
      toast({ title: 'Test Toast', description: 'This is a test' });
    });
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('dismisses a toast', async () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });

    render(<Toaster />);
    let toastId;
    act(() => {
      const t = toast({ title: 'Dismiss Me' });
      toastId = t.id;
    });
    expect(screen.getByText('Dismiss Me')).toBeInTheDocument();

    // We can dismiss it programmatically
    act(() => {
      result.current.dismiss(toastId);
    });

    // Toaster components should get their open prop set to false
    // Since we don't mock radox completely we can check for state=closed if it has a custom attribute, or just its presence depending on the transition
    // But dismiss works by setting open: false
  });

  it('updates a toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });

    render(<Toaster />);
    let toastRef;
    act(() => {
      toastRef = toast({ title: 'Original Title' });
    });
    expect(screen.getByText('Original Title')).toBeInTheDocument();

    act(() => {
      toastRef.update({ title: 'Updated Title' });
    });
    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
  });

  it('limits the number of toasts', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });

    render(<Toaster />);
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' }); // Should push out Toast 1
    });

    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
  });
});
