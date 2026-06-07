"use client";

import { useState, useEffect, useCallback } from 'react';

interface BookingSlot {
  studentName: string;
  parentPhone: string;
  bookingType: 'single' | 'companion';
  companionName: string | null;
  fee: number;
  bookedAt: string;
}

interface Student {
  name: string;
  birthday: string;
  parentPhone: string;
}

const WEEKS_DATA = [
  ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'],
  ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'],
  ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
  ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'],
  ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'],
  ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']
];

const PYTHON_WEEK = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'];

export default function Home() {
  const [student, setStudent] = useState<Student | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [birthdayInput, setBirthdayInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  
  // Companion state
  const [isCompanionMode, setIsCompanionMode] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [isCompanionVerified, setIsCompanionVerified] = useState(false);
  const [companionError, setCompanionError] = useState('');

  // Selected dates for batch booking
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelTargetDate, setCancelTargetDate] = useState<string | null>(null);

  // Bookings map for all calendar dates
  const [bookingData, setBookingData] = useState<Record<string, BookingSlot[]>>({});

  const fetchAllBookings = useCallback(async () => {
    const allDates = WEEKS_DATA.flat();
    const data: Record<string, BookingSlot[]> = {};
    await Promise.all(
      allDates.map(async (date) => {
        try {
          const res = await fetch(`/api/booking/slots?date=${date}`);
          if (res.ok) {
            const json = await res.json();
            data[date] = json.slots || [];
          } else {
            data[date] = [];
          }
        } catch {
          data[date] = [];
        }
      })
    );
    setBookingData(data);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('student_session');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStudent(JSON.parse(saved));
      } catch {
        localStorage.removeItem('student_session');
      }
    }
    fetchAllBookings();
  }, [fetchAllBookings]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllBookings();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAllBookings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !birthdayInput.trim() || !phoneInput.trim()) {
      setErrorMsg('所有欄位皆為必填。');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSelectedDates([]);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          birthday: birthdayInput.trim(),
          parentPhone: phoneInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const loggedInUser: Student = {
          name: nameInput.trim(),
          birthday: birthdayInput.trim(),
          parentPhone: phoneInput.trim()
        };
        setStudent(loggedInUser);
        localStorage.setItem('student_session', JSON.stringify(loggedInUser));
        setNameInput('');
        setBirthdayInput('');
        setPhoneInput('');
      } else if (data.error === 'not_registered') {
        setShowRegConfirm(true);
      } else {
        setErrorMsg(data.error === 'invalid_inputs' ? '輸入的資料無效。' : '此學生尚未註冊。');
      }
    } catch {
      setErrorMsg('無法連接到驗證伺服器。');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRegister = async () => {
    setShowRegConfirm(false);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          birthday: birthdayInput.trim(),
          parentPhone: phoneInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const loggedInUser: Student = {
          name: nameInput.trim(),
          birthday: birthdayInput.trim(),
          parentPhone: phoneInput.trim()
        };
        setStudent(loggedInUser);
        localStorage.setItem('student_session', JSON.stringify(loggedInUser));
        setNameInput('');
        setBirthdayInput('');
        setPhoneInput('');
      } else {
        setErrorMsg(data.error || '註冊失敗。');
      }
    } catch {
      setErrorMsg('註冊學生時發生錯誤。');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setStudent(null);
    localStorage.removeItem('student_session');
    setIsCompanionMode(false);
    setCompanionName('');
    setIsCompanionVerified(false);
    setCompanionError('');
    setSelectedDates([]);
  };

  const checkCompanionStatus = useCallback(async (name: string) => {
    if (!name.trim()) {
      setIsCompanionVerified(false);
      setCompanionError('');
      return;
    }
    try {
      const res = await fetch(`/api/auth/validate-companion?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setIsCompanionVerified(true);
        setCompanionError('');
      } else {
        setIsCompanionVerified(false);
        setCompanionError(`「${name} 未註冊」`);
      }
    } catch {
      setIsCompanionVerified(false);
      setCompanionError('檢查同行者狀態時發生錯誤。');
    }
  }, []);

  useEffect(() => {
    if (!companionName.trim()) {
      return;
    }
    const timer = setTimeout(() => {
      checkCompanionStatus(companionName);
    }, 400);

    return () => clearTimeout(timer);
  }, [companionName, checkCompanionStatus]);

  const handleCompanionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanionName(val);
    if (!val.trim()) {
      setIsCompanionVerified(false);
      setCompanionError('');
    }
  };

  const myBookingsCount = student
    ? Object.values(bookingData).filter((slots) =>
        slots.some((s) => s.studentName === student.name)
      ).length
    : 0;

  const handleBatchBook = async () => {
    if (!student || selectedDates.length === 0) return;

    if (isCompanionMode && !isCompanionVerified) {
      alert('請先輸入並驗證已註冊的同行者姓名。');
      return;
    }

    if (myBookingsCount + selectedDates.length > 15) {
      alert(`預約失敗：超出每人最多預約 15 天的限制（您已預約 ${myBookingsCount} 天，本次選擇 ${selectedDates.length} 天）。`);
      return;
    }

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': encodeURIComponent(student.name),
          'x-user-birthday': student.birthday,
          'x-user-phone': student.parentPhone
        },
        body: JSON.stringify({
          dates: selectedDates,
          isCompanionMode,
          companionName: isCompanionMode ? companionName.trim() : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDates([]);
        setShowBookingConfirm(false);
        setShowSuccessAlert(true);
        await fetchAllBookings();
      } else {
        alert(`預約失敗: ${data.error}`);
      }
    } catch {
      alert('預約失敗，請稍後再試。');
    }
  };

  const handleCancel = async (date: string) => {
    if (!student) return;

    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': encodeURIComponent(student.name),
          'x-user-birthday': student.birthday,
          'x-user-phone': student.parentPhone
        },
        body: JSON.stringify({ date })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAllBookings();
      } else {
        alert(`取消失敗: ${data.error}`);
      }
    } catch {
      alert('取消失敗，請稍後再試。');
    }
  };

  const toggleDateSelection = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  if (!student) {
    return (
      <div className="app-container">
        <div className="login-card">
          <h1>Jeff老師暑期班預約系統</h1>
          {errorMsg && <div style={{ color: 'var(--accent-rose)', marginBottom: '1rem', fontSize: '0.875rem' }}>{errorMsg}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>學生姓名</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="例如：張三"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label>生日 (YYYYMMDD)</label>
              <input
                type="text"
                value={birthdayInput}
                onChange={(e) => setBirthdayInput(e.target.value)}
                placeholder="例如：20180815"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label>家長電話</label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="例如：0912345678"
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '處理中...' : '登入系統'}
            </button>
          </form>
        </div>

        {showRegConfirm && (
          <div className="dialog-overlay">
            <div className="dialog-box">
              <h2>學生尚未註冊</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
                系統中查無此學生資料。是否要使用上述填寫的資訊進行註冊？
              </p>
              <div className="dialog-actions">
                <button className="dialog-btn confirm" onClick={handleConfirmRegister}>
                  確認註冊
                </button>
                <button className="dialog-btn cancel" onClick={() => setShowRegConfirm(false)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="dashboard-header">
        <div>
          <h1>Jeff老師暑期班預約系統</h1>
          <div className="profile-stats">
            <div className="stat-badge">
              歡迎，<strong>{student.name}</strong>
            </div>
            <div className="stat-badge">
              預約進度：<strong>{myBookingsCount} / 15 天</strong>
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          登出
        </button>
      </div>

      <div className="companion-controls">
        <label className="companion-toggle-label">
          <input
            type="checkbox"
            checked={isCompanionMode}
            onChange={(e) => {
              setIsCompanionMode(e.target.checked);
              if (!e.target.checked) {
                setCompanionName('');
                setIsCompanionVerified(false);
                setCompanionError('');
              }
              setSelectedDates([]);
            }}
          />
          兩人同行 (享 10% 優惠)
        </label>

        {isCompanionMode && (
          <div className="companion-input-wrapper">
            <input
              type="text"
              className="companion-input"
              placeholder="同行者姓名"
              value={companionName}
              onChange={handleCompanionChange}
            />
            {isCompanionVerified && (
              <span className="companion-status success">
                已確認
              </span>
            )}
            {companionError && (
              <span className="companion-status error">
                {companionError}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="calendar-section">
        <div className="calendar-header-bar">
          <h2 style={{ margin: 0 }}>預約日期</h2>
          <button
            className="submit-btn"
            style={{ width: 'auto', padding: '0.6rem 2rem', opacity: selectedDates.length > 0 ? 1 : 0.5 }}
            disabled={selectedDates.length === 0}
            onClick={() => setShowBookingConfirm(true)}
          >
            確認預約 ({selectedDates.length} 天)
          </button>
        </div>

        <div className="calendar-grid-container">
          <div className="grid-headers-wrapper">
            <div className="grid-header">週一</div>
            <div className="grid-header">週二</div>
            <div className="grid-header">週三</div>
            <div className="grid-header">週四</div>
            <div className="grid-header">週五</div>
          </div>

          <div className="calendar-weeks-list">
            {WEEKS_DATA.map((week, weekIdx) => (
              <div key={weekIdx} className="week-group">
                {week.map((dateStr, dayIdx) => {
              const dateParts = dateStr.split('-');
              const displayDate = `${dateParts[1]}/${dateParts[2]}`;
              const weekdays = ['週一', '週二', '週三', '週四', '週五'];
              const weekdayName = weekdays[dayIdx];
              const isPython = PYTHON_WEEK.includes(dateStr);
              const slots = bookingData[dateStr] || [];
              const myBooking = slots.find((s) => s.studentName === student.name);

              let cellClass = 'date-cell';
              let actionElement = null;
              let slotText = '';

              const isSelected = selectedDates.includes(dateStr);

              // Calculate slots details
              const remaining = 2 - slots.length;
              const isSelectable = !isPython && !myBooking && (isCompanionMode ? (isCompanionVerified && remaining === 2) : (remaining >= 1));

              if (isPython) {
                cellClass += ' python-reserved';
                slotText = '額滿';
              } else if (myBooking) {
                cellClass += ' my-booking';
                const companionText =
                  myBooking.bookingType === 'companion' && myBooking.companionName
                    ? `與 ${myBooking.companionName} `
                    : '';
                slotText = `${companionText}上課`;
                actionElement = (
                  <button 
                    className="cancel-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCancelTargetDate(dateStr);
                      setShowCancelConfirm(true);
                    }}
                  >
                    取消
                  </button>
                );
              } else if (slots.length >= 2) {
                cellClass += ' fully-booked';
                slotText = '額滿';
              } else {
                if (isCompanionMode && remaining < 2) {
                  cellClass += ' fully-booked';
                  slotText = '空位 1 (兩人同行需 2 個空位)';
                } else {
                  slotText = `空位 ${remaining}`;
                }
              }

              if (isSelected) {
                cellClass += ' selected-cell';
              }

              const handleCellClick = () => {
                if (isSelectable) {
                  toggleDateSelection(dateStr);
                }
              };

              return (
                <div
                  key={dateStr}
                  className={cellClass}
                  style={{ cursor: isSelectable ? 'pointer' : 'default' }}
                  onClick={handleCellClick}
                  data-tooltip={isPython ? 'Python' : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="date-number">
                      {displayDate} <span className="mobile-weekday">({weekdayName})</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      W{weekIdx + 1}
                    </span>
                  </div>
                  <div className="slot-indicator">{slotText}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '26px' }}>{actionElement}</div>
                </div>
              );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showBookingConfirm && (
        <div className="dialog-overlay">
          <div className="dialog-box" style={{ maxWidth: '500px' }}>
            <h2>確認預約</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '1rem 0', textAlign: 'left', lineHeight: '1.6' }}>
              您已選擇預約以下日期 ({selectedDates.length} 天)：
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', background: '#f5f5f4', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {selectedDates.map(d => {
                const parts = d.split('-');
                return <span key={d} style={{ background: 'var(--accent-amber)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>{parts[1]}/{parts[2]}</span>;
              })}
            </div>
            {isCompanionMode && (
              <p style={{ color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                同行者：{companionName} (已套用兩人同行優惠)
              </p>
            )}
            <div className="dialog-actions">
              <button className="dialog-btn confirm" onClick={handleBatchBook}>
                確認送出
              </button>
              <button className="dialog-btn cancel" onClick={() => setShowBookingConfirm(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessAlert && (
        <div className="dialog-overlay">
          <div className="dialog-box" style={{ maxWidth: '400px' }}>
            <h2>預約成功</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '1.5rem 0', fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' }}>
              等待老師電話聯繫確認
            </p>
            <div className="dialog-actions" style={{ justifyContent: 'center' }}>
              <button className="dialog-btn confirm" onClick={() => setShowSuccessAlert(false)}>
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="dialog-overlay">
          <div className="dialog-box" style={{ maxWidth: '400px' }}>
            <h2>確認取消預約</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '1.5rem 0', textAlign: 'center', lineHeight: '1.6' }}>
              您確定要取消此預約嗎？<br />
              <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>（若為兩人同行預約，將一併取消雙方的預約）</span>
            </p>
            <div className="dialog-actions">
              <button 
                className="dialog-btn confirm" 
                style={{ background: 'var(--accent-rose)' }}
                onClick={() => {
                  if (cancelTargetDate) {
                    handleCancel(cancelTargetDate);
                  }
                  setShowCancelConfirm(false);
                  setCancelTargetDate(null);
                }}
              >
                確認取消
              </button>
              <button 
                className="dialog-btn cancel" 
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelTargetDate(null);
                }}
              >
                保留預約
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
