const { updateStreak } = require('../../src/utils/streakManager');
const { User } = require('../../src/models');

jest.mock('../../src/models', () => ({
  User: {
    findByPk: jest.fn()
  }
}));

describe('streakManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize streak to 1 if no previous activity', async () => {
    const mockUser = {
      update: jest.fn()
    };
    User.findByPk.mockResolvedValue(mockUser);

    await updateStreak('user1');

    expect(User.findByPk).toHaveBeenCalledWith('user1');
    expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
      current_streak: 1,
      last_activity_date: expect.any(Date)
    }));
  });

  it('should increment streak if active consecutively', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const mockUser = {
      last_activity_date: yesterday,
      current_streak: 2,
      highest_streak: 2,
      update: jest.fn()
    };
    User.findByPk.mockResolvedValue(mockUser);

    await updateStreak('user1');

    expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
      current_streak: 3,
      highest_streak: 3,
      last_activity_date: expect.any(Date)
    }));
  });

  it('should not update user if user not found', async () => {
    User.findByPk.mockResolvedValue(null);
    await updateStreak('user_not_found');
    expect(User.findByPk).toHaveBeenCalledWith('user_not_found');
  });

  it('should reset streak if gap is more than 1 day', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const mockUser = {
      last_activity_date: twoDaysAgo,
      current_streak: 5,
      highest_streak: 5,
      update: jest.fn()
    };
    User.findByPk.mockResolvedValue(mockUser);

    await updateStreak('user1');

    expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
      current_streak: 1,
      last_activity_date: expect.any(Date)
    }));
  });

  it('should not increment if activity is on the same day', async () => {
    const today = new Date();

    const mockUser = {
      last_activity_date: today,
      current_streak: 5,
      highest_streak: 5,
      update: jest.fn()
    };
    User.findByPk.mockResolvedValue(mockUser);

    await updateStreak('user1');

    // Should only call update to refresh the last_activity_date without modifying streak
    expect(mockUser.update).toHaveBeenCalledWith({
      last_activity_date: expect.any(Date)
    });
  });
});
