import * as React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '../components/ui/toast';
import { describe, it, expect } from 'vitest';

describe('Toast UI Components', () => {
  it('renders standard toast with title and description', () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle>Hello World Title</ToastTitle>
          <ToastDescription>This is a toast description.</ToastDescription>
          <ToastAction altText="Action" asChild>
            <button>Click Me</button>
          </ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    expect(screen.getByText('Hello World Title')).toBeInTheDocument();
    expect(screen.getByText('This is a toast description.')).toBeInTheDocument();
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
});
