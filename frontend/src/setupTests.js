import "@testing-library/jest-dom";

window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLCanvasElement.prototype.getContext = () => {};

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null
}));
