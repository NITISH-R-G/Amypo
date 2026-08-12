import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreGauge from '../components/results/ScoreGauge';
import React from 'react';

describe('ScoreGauge Component', () => {
  it('renders correctly with score 100', () => {
    const { container } = render(<ScoreGauge score={100} label="Perfect" size="md" />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Perfect')).toBeInTheDocument();

    // Test that the class includes 'text-emerald-500' (from emerald theme)
    const span = screen.getByText('100');
    expect(span.className).toContain('text-emerald-500');
  });

  it('renders correctly with score 80 (indigo theme)', () => {
    render(<ScoreGauge score={80} label="Good" size="sm" />);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();

    const span = screen.getByText('80');
    expect(span.className).toContain('text-emerald-600'); // Note: 'indigo' theme maps to 'text-emerald-600'
  });

  it('renders correctly with score 50 (amber theme)', () => {
    render(<ScoreGauge score={50} label="Okay" size="lg" />);
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Okay')).toBeInTheDocument();

    const span = screen.getByText('50');
    expect(span.className).toContain('text-amber-500');
  });

  it('renders correctly with score 20 (red theme)', () => {
    render(<ScoreGauge score={20} label="Poor" size="md" />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();

    const span = screen.getByText('20');
    expect(span.className).toContain('text-red-500');
  });
});
