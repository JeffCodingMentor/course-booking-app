/**
 * @jest-environment node
 */
import { sendLineNotification } from '../lib/notify';

describe('LINE Notify Client via ChatEverywhere', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as unknown as Response)
    );
    process.env.CHAT_EVERYWHERE_TOKEN = 'mock_secret_token';
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete process.env.CHAT_EVERYWHERE_TOKEN;
  });

  it('should post single booking message to ChatEverywhere API in markdown format', async () => {
    const payload = {
      isCompanionMode: false,
      mainStudent: '張三',
      companionStudent: null,
      dates: ['07/20'],
      parentPhone: '0912345678'
    };

    const result = await sendLineNotification(payload);
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://v2.chateverywhere.app/api/line/notify',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock_secret_token',
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('## 新預約：')
      })
    );
  });

  it('should post companion booking message to ChatEverywhere API in markdown format', async () => {
    const payload = {
      isCompanionMode: true,
      mainStudent: '張三',
      companionStudent: '李四',
      dates: ['07/20'],
      parentPhone: '0912345678'
    };

    const result = await sendLineNotification(payload);
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://v2.chateverywhere.app/api/line/notify',
      expect.objectContaining({
        body: expect.stringContaining('## 新預約（兩人同行）：')
      })
    );
  });
});
