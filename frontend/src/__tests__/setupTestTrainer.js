import { vi } from 'vitest';
vi.mock('../pages/TrainerPanel', () => ({
  default: () => <div>Trainer Panel Content Mocked</div>
}));
