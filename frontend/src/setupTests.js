import "@testing-library/jest-dom";
import { vi } from 'vitest';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));
