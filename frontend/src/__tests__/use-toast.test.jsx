import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import { useEffect } from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

function ToastResetter() {
  const { dismiss } = useToast();
  useEffect(() => {
    // Calling dismiss without an ID dismisses all toasts.
    // However, since they rely on timers to be removed, we need an empty dependency array.
    dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<ToastResetter />);
    act(() => {
      // Clear out the state cleanly
      vi.runAllTimers();
    });
  });

  afterEach(() => {
    // Reset global state if necessary, run all timers to clear timeouts
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast', description: 'Testing adding a toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('should enforce toast limit of 3', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' });
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].title).toBe('Toast 4');
    expect(result.current.toasts[2].title).toBe('Toast 2');
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastObj;
    act(() => {
      toastObj = toast({ title: 'Original Title' });
    });

    act(() => {
      toastObj.update({ id: toastObj.id, title: 'Updated Title' });
    });

    // The state returns only toasts currently open/recent
    expect(result.current.toasts.find(t => t.id === toastObj.id).title).toBe('Updated Title');
  });

  it('should dismiss a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastObj;
    act(() => {
      toastObj = toast({ title: 'To Be Dismissed' });
    });

    act(() => {
      toastObj.dismiss();
    });

    expect(result.current.toasts.find(t => t.id === toastObj.id).open).toBe(false);
  });

  it('should remove a dismissed toast after delay', () => {
    const { result } = renderHook(() => useToast());

    let toastObj;
    act(() => {
      toastObj = toast({ title: 'Will Be Removed' });
    });

    act(() => {
      toastObj.dismiss();
    });

    // Toast is dismissed but still in array
    expect(result.current.toasts.find(t => t.id === toastObj.id)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Now it should be completely removed
    expect(result.current.toasts.find(t => t.id === toastObj.id)).toBeUndefined();
  });

  it('should avoid adding multiple removal timeouts for the same toast', () => {
      const { result } = renderHook(() => useToast());

      let toastObj;
      act(() => {
        toastObj = toast({ title: 'Double Dismiss' });
      });

      act(() => {
        toastObj.dismiss();
        toastObj.dismiss();
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts.find(t => t.id === toastObj.id)).toBeUndefined();
  });

  it('should dismiss all toasts if no id is provided', () => {
    const { result } = renderHook(() => useToast());
    const { dismiss } = result.current;

    let toast1, toast2;
    act(() => {
      toast1 = toast({ title: 'Toast 1' });
      toast2 = toast({ title: 'Toast 2' });
    });

    act(() => {
      dismiss();
    });

    expect(result.current.toasts.find(t => t.id === toast1.id).open).toBe(false);
    expect(result.current.toasts.find(t => t.id === toast2.id).open).toBe(false);
  });

  it('should remove all toasts if REMOVE_TOAST action has undefined toastId', () => {
        const { result } = renderHook(() => useToast());
        const { dismiss } = result.current;

        let toastObj;
        act(() => {
            toastObj = toast({ title: 'Toast 1' });
        });

        act(() => {
           dismiss();
        });

        act(() => {
           vi.advanceTimersByTime(10000);
        });

        expect(result.current.toasts.find(t => t.id === toastObj.id)).toBeUndefined();
  });
});

describe('Toaster Component', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      render(<ToastResetter />);
      act(() => {
        vi.runAllTimers();
      });
    });

    afterEach(() => {
      act(() => {
        vi.runAllTimers();
      });
      vi.useRealTimers();
    });

    it('renders toasts', () => {
      render(<Toaster />);

      act(() => {
        toast({ title: 'Component Test', description: 'Renders in DOM' });
      });

      expect(screen.getByText('Component Test')).toBeInTheDocument();
      expect(screen.getByText('Renders in DOM')).toBeInTheDocument();
    });

    it('removes toast when closed (via onOpenChange)', async () => {
        render(<Toaster />);

        let toastObj;
        act(() => {
          toastObj = toast({ title: 'Closable Toast' });
        });

        act(() => {
           toastObj.dismiss();
        });

        act(() => {
           vi.advanceTimersByTime(10000);
        });

        expect(screen.queryByText('Closable Toast')).not.toBeInTheDocument();
      });
});
