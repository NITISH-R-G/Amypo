import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import { useToast, toast, Toaster, dispatch } from '../components/ui/use-toast';

describe('use-toast', () => {
  let hookResult;

  beforeEach(() => {
    const { result } = renderHook(() => useToast());
    hookResult = result;
  });

  afterEach(() => {
    // Clear the memory state
    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });
  });

  it('adds a toast', () => {
    act(() => {
      toast({ title: 'Test Toast', description: 'Test Description' });
    });

    expect(hookResult.current.toasts.length).toBe(1);
    expect(hookResult.current.toasts[0].title).toBe('Test Toast');
  });

  it('updates a toast', () => {
    let t;
    act(() => {
      t = toast({ title: 'Test Toast' });
    });

    act(() => {
      t.update({ title: 'Updated Toast' });
    });

    expect(hookResult.current.toasts[0].title).toBe('Updated Toast');
  });

  it('dismisses a toast', () => {
    let t;
    act(() => {
      t = toast({ title: 'Test Toast' });
    });

    act(() => {
      t.dismiss();
    });

    expect(hookResult.current.toasts[0].open).toBe(false);
  });

  it('dismisses via onOpenChange', () => {
    act(() => {
      toast({ title: 'Test Toast' });
    });

    act(() => {
      hookResult.current.toasts[0].onOpenChange(false);
    });

    expect(hookResult.current.toasts[0].open).toBe(false);
  });

  it('dismisses all toasts', () => {
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    act(() => {
      hookResult.current.dismiss();
    });

    expect(hookResult.current.toasts.every(t => !t.open)).toBe(true);
  });

  it('renders Toaster correctly', () => {
    act(() => {
      toast({ title: 'Toaster Title', description: 'Toaster Desc' });
    });

    render(<Toaster />);
    expect(screen.getByText('Toaster Title')).toBeInTheDocument();
    expect(screen.getByText('Toaster Desc')).toBeInTheDocument();
  });

  it('handles REMOVE_TOAST', () => {
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    // Test removing specific toast
    const toastIdToRemove = hookResult.current.toasts[0].id;
    act(() => {
      dispatch({ type: 'REMOVE_TOAST', toastId: toastIdToRemove });
    });
    expect(hookResult.current.toasts.length).toBe(1);

    // Test removing all toasts
    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });
    expect(hookResult.current.toasts.length).toBe(0);
  });

  it('handles UPDATE_TOAST not matching', () => {
    act(() => {
      toast({ title: 'Toast 1' });
    });
    act(() => {
      dispatch({ type: 'UPDATE_TOAST', toast: { id: 'non-existent', title: 'New Title' } });
    });
    expect(hookResult.current.toasts[0].title).toBe('Toast 1');
  });
});
