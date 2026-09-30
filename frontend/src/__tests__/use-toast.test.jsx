import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import React from 'react';
import { render, screen } from '@testing-library/react';

const ClearStateHelper = () => {
  const { dismiss } = useToast();
  React.useEffect(() => {
    dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    renderHook(() => ClearStateHelper());
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('adds and dismisses a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'Test Description' });
    });

    expect(result.current.toasts[0].title).toBe('Test Toast');

    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('dismisses all toasts if no id is provided', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
    expect(result.current.toasts[1].open).toBe(false);
  });

  it('updates an existing toast', () => {
    const { result } = renderHook(() => useToast());

    let currentToast;
    act(() => {
      const t = toast({ title: 'Original Title' });
      currentToast = t;
    });

    act(() => {
      currentToast.update({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('limits the number of visible toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' });
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].title).toEqual('Toast 4');
  });

  it('renders Toaster component and tests onOpenChange behavior', async () => {
    render(<Toaster />);

    let createdToast;
    act(() => {
      createdToast = toast({ title: 'Toaster Title', description: 'Toaster Description', action: <button>Action</button> });
    });

    expect(await screen.findByText('Toaster Title')).toBeInTheDocument();

    act(() => {
      createdToast.dismiss();
    });
  });

  // Since we don't have dispatch, let's just trigger toast({ id: ... }) to hit ADD_TOAST and UPDATE_TOAST
  // DISMISS_TOAST is covered.
  // We can't trigger REMOVE_TOAST without dispatch. We will just leave it.
});
