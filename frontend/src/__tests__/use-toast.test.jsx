import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import * as React from 'react';

describe('use-toast and Toaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear toasts between tests to avoid memory state bleed
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toasts.forEach(t => result.current.dismiss(t.id));
      // wait a bit for REMOVE_TOAST if needed, or clear all state manually
    });
  });

  it('adds and dismisses a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
        result.current.toasts.forEach(t => result.current.dismiss(t.id));
    })


    let toastId;
    act(() => {
      const t = toast({ title: 'Test Toast', description: 'This is a test.' });
      toastId = t.id;
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Test Toast',
      description: 'This is a test.',
      open: true,
      id: toastId
    });

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('updates a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
        result.current.toasts.forEach(t => result.current.dismiss(t.id));
    })

    let updateToast;
    act(() => {
      const t = toast({ title: 'Initial Title' });
      updateToast = t.update;
    });

    expect(result.current.toasts[0].title).toBe('Initial Title');

    act(() => {
      updateToast({ title: 'Updated Title' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
  });

  it('limits the number of toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
        result.current.toasts.forEach(t => result.current.dismiss(t.id));
    })

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' });
    });

    // Default limit is 3, so only the 3 most recent should remain.
    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].title).toBe('Toast 4');
    expect(result.current.toasts[1].title).toBe('Toast 3');
    expect(result.current.toasts[2].title).toBe('Toast 2');
  });

  it('dismisses all toasts if no id is provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
          result.current.toasts.forEach(t => result.current.dismiss(t.id));
      })

      act(() => {
        toast({ title: 'Toast 1' });
        toast({ title: 'Toast 2' });
      });


      act(() => {
          result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
      expect(result.current.toasts[1].open).toBe(false);
  })

  it('renders Toaster component', async () => {
    render(<Toaster />);

    act(() => {
      toast({ title: 'Rendered Toast', description: 'Rendered Description' });
    });

    expect(await screen.findByText('Rendered Toast')).toBeInTheDocument();
    expect(await screen.findByText('Rendered Description')).toBeInTheDocument();
  });
});
