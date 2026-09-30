import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '../../components/ui/toast';

describe('Toast Components', () => {
  test('renders ToastProvider and ToastViewport', () => {
    const { container } = render(
      <ToastProvider>
        <ToastViewport className="test-viewport-class" />
      </ToastProvider>
    );
    const viewport = container.querySelector('.test-viewport-class');
    expect(viewport).toBeInTheDocument();
  });

  test('renders Toast with properties', () => {
    const { container } = render(
      <ToastProvider>
        <Toast className="test-toast-class" open={true}>
          <ToastTitle>My Toast Title</ToastTitle>
          <ToastDescription>My Toast Description</ToastDescription>
          <ToastAction altText="Try again">Action</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    expect(screen.getByText('My Toast Title')).toBeInTheDocument();
    expect(screen.getByText('My Toast Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();

    // Check if close button is present (typically has an accessible role or SVG icon inside)
    // Here we can just check if Toast rendered by querying its content.
    const toastElem = container.querySelector('.test-toast-class');
    expect(toastElem).toBeInTheDocument();
  });

  test('renders ToastAction and applies classes', () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <ToastAction altText="Retry" className="test-action-class">Retry Action</ToastAction>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    const action = screen.getByText('Retry Action');
    expect(action).toBeInTheDocument();
    expect(action).toHaveClass('test-action-class');
  });

  test('renders ToastClose and applies classes', () => {
    const { container } = render(
      <ToastProvider>
        <Toast open={true}>
          <ToastClose className="test-close-class" />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    const closeBtn = container.querySelector('.test-close-class');
    expect(closeBtn).toBeInTheDocument();
  });

  test('renders ToastTitle and ToastDescription', () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle className="test-title-class">Title text</ToastTitle>
          <ToastDescription className="test-description-class">Description text</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    const title = screen.getByText('Title text');
    const desc = screen.getByText('Description text');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('test-title-class');
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveClass('test-description-class');
  });
});
