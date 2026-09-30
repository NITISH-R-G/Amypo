import { render, act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToast, toast, dispatch, Toaster } from '../../components/ui/use-toast';
import React from 'react';

describe('useToast', () => {
  beforeEach(() => {
    dispatch({ type: "REMOVE_TOAST" });
  });

  it('adds, updates, dismisses and removes a toast', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Hello', description: 'World' });
    });

    expect(result.current.toasts).toContainEqual(
      expect.objectContaining({ title: 'Hello', description: 'World' })
    );

    act(() => {
      t.update({ title: 'Hello Updated' });
    });

    expect(result.current.toasts).toContainEqual(
      expect.objectContaining({ title: 'Hello Updated', description: 'World' })
    );

    act(() => {
      t.dismiss();
    });

    expect(result.current.toasts.find(toast => toast.id === t.id).open).toBe(false);
  });

  it('dismisses a toast by id directly via useToast dismiss', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Another Toast' });
    });
    act(() => {
      result.current.dismiss(t.id);
    });
    expect(result.current.toasts.find(toast => toast.id === t.id).open).toBe(false);
  });

  it('dismisses all toasts when dismiss is called without id', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'T1' });
      toast({ title: 'T2' });
    });
    expect(result.current.toasts.length).toBe(2);

    act(() => {
      result.current.dismiss();
    });

    result.current.toasts.forEach(t => {
      expect(t.open).toBe(false);
    });
  });

  it('removes a specific toast via REMOVE_TOAST', () => {
    const { result } = renderHook(() => useToast());
    let t;
    act(() => {
      t = toast({ title: 'Toast to remove' });
    });
    expect(result.current.toasts.length).toBe(1);

    act(() => {
      dispatch({ type: 'REMOVE_TOAST', toastId: t.id });
    });

    expect(result.current.toasts.length).toBe(0);
  });

  it('renders Toaster component', () => {
    act(() => {
      toast({ title: 'Toast Title', description: 'Toast Desc' });
    });

    const { getByText } = render(<Toaster />);
    expect(getByText('Toast Title')).toBeInTheDocument();
    expect(getByText('Toast Desc')).toBeInTheDocument();
  });
});
