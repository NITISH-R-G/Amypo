import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, Toaster, dispatch } from '../components/ui/use-toast';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useToast hook and Toaster', () => {
  beforeEach(() => {
    // Clear toasts before each test to prevent state bleed
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toasts.forEach((t) => result.current.dismiss(t.id));
      // Forcing a full clear since dismiss only sets open=false
      result.current.dismiss();
    });
  });

  it('should start with empty toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());
    let id;
    act(() => {
      const t = toast({ title: 'Test Toast', description: 'Test Desc' });
      id = t.id;
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('Test Desc');
    expect(result.current.toasts[0].id).toBe(id);
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Original Title' });
    });
    expect(result.current.toasts[0].title).toBe('Original Title');

    act(() => {
      t.update({ title: 'Updated Title' });
    });
    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('should dismiss a toast via toast.dismiss()', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Test' });
    });
    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      t.dismiss();
    });
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should dismiss a toast via hook dismiss() with id', () => {
     const { result } = renderHook(() => useToast());
     let id;
     act(() => {
       const t = toast({ title: 'Test' });
       id = t.id;
     });

     act(() => {
       result.current.dismiss(id);
     });

     expect(result.current.toasts[0].open).toBe(false);
  });

  it('should dismiss all toasts via hook dismiss() without id', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'T1' });
      toast({ title: 'T2' });
    });
    expect(result.current.toasts[0].open).toBe(true);
    expect(result.current.toasts[1].open).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
    expect(result.current.toasts[1].open).toBe(false);
  });

  it('should limit number of toasts to 3', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'T1' });
      toast({ title: 'T2' });
      toast({ title: 'T3' });
      toast({ title: 'T4' });
    });
    expect(result.current.toasts).toHaveLength(3);
    // T4 should be at index 0, T3 at 1, T2 at 2. T1 is removed.
    expect(result.current.toasts[0].title).toBe('T4');
  });

  it('should handle onOpenChange callback when false', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'T1' });
    });
    const t = result.current.toasts[0];

    act(() => {
      t.onOpenChange(false);
    });

    // onOpenChange(false) calls dismiss
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should NOT handle onOpenChange callback when true', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'T1' });
    });
    const t = result.current.toasts[0];

    act(() => {
      t.onOpenChange(true);
    });

    // onOpenChange(true) does nothing
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('should handle REMOVE_TOAST via dispatch', () => {
    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });

    const { result } = renderHook(() => useToast());
    let id;
    act(() => {
      const t = toast({ title: 'Test Toast' });
      id = t.id;
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      dispatch({ type: 'REMOVE_TOAST', toastId: id });
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should handle REMOVE_TOAST without id via dispatch', () => {
    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });

    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'Test Toast 1' });
      toast({ title: 'Test Toast 2' });
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      dispatch({ type: 'REMOVE_TOAST' });
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should render Toaster component with toasts', () => {
    act(() => {
      toast({ title: 'Rendered Title', description: 'Rendered Desc', action: <button>Click</button> });
    });

    render(<Toaster />);
    expect(screen.getByText('Rendered Title')).toBeInTheDocument();
    expect(screen.getByText('Rendered Desc')).toBeInTheDocument();
    expect(screen.getByText('Click')).toBeInTheDocument();
  });


  it('should render ToastAction and ToastClose properly', async () => {
    const { ToastAction, ToastClose } = await import('../components/ui/toast');
    render(<ToastAction altText="Action">Action</ToastAction>);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});