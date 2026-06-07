export interface NotifyPayload {
  isCompanionMode: boolean;
  mainStudent: string;
  companionStudent: string | null;
  dates: string[];
  parentPhone: string;
}

export async function sendLineNotification(payload: NotifyPayload): Promise<boolean> {
  const token = process.env.CHAT_EVERYWHERE_TOKEN;
  if (!token) {
    console.warn('CHAT_EVERYWHERE_TOKEN environment variable is not defined. Skipping notification.');
    return false;
  }

  const dateListStr = payload.dates.join('、');
  let message = '';

  if (payload.isCompanionMode && payload.companionStudent) {
    message = `## 新預約（兩人同行）：\n- 預約人： ${payload.mainStudent}\n- 同行者： ${payload.companionStudent}\n- 日期： ${dateListStr}\n- 電話： ${payload.parentPhone}`;
  } else {
    message = `## 新預約：\n- 學生： ${payload.mainStudent}\n- 日期： ${dateListStr}\n- 電話： ${payload.parentPhone}`;
  }

  try {
    const response = await fetch('https://v2.chateverywhere.app/api/line/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        markdown: true
      })
    });

    if (!response.ok) {
      console.error('ChatEverywhere LINE API returned HTTP error:', response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to connect to ChatEverywhere LINE API:', err);
    return false;
  }
}
