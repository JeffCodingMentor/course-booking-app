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
  const [isCompanionMode, setIsCompanionMode] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [isCompanionVerified, setIsCompanionVerified] = useState(false);
  const [companionError, setCompanionError] = useState('');
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
      setErrorMsg('All fields are required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

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
        setErrorMsg(data.error || 'Login failed.');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server.');
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
        setErrorMsg(data.error || 'Registration failed.');
      }
    } catch {
      setErrorMsg('Failed to register student.');
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
  };

  const checkCompanionStatus = async (name: string) => {
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
      setCompanionError('Error checking companion status.');
    }
  };

  const handleCompanionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanionName(val);
    checkCompanionStatus(val);
  };

  const myBookingsCount = student
    ? Object.values(bookingData).filter((slots) =>
        slots.some((s) => s.studentName === student.name)
      ).length
    : 0;

  const handleBook = async (date: string) => {
    if (!student) return;

    if (isCompanionMode && !isCompanionVerified) {
      alert('Cannot book in companion mode without a registered companion.');
      return;
    }

    if (myBookingsCount >= 15) {
      alert('You have reached the maximum limit of 15 bookings.');
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
          date,
          isCompanionMode,
          companionName: isCompanionMode ? companionName.trim() : null
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAllBookings();
      } else {
        alert(`Booking failed: ${data.error}`);
      }
    } catch {
      alert('Failed to book class.');
    }
  };

  const handleCancel = async (date: string) => {
    if (!student) return;
    if (!confirm('Are you sure you want to cancel this booking? (If it is a companion booking, both slots will be canceled).')) {
      return;
    }

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
        alert(`Cancellation failed: ${data.error}`);
      }
    } catch {
      alert('Failed to cancel booking.');
    }
  };

  if (!student) {
    return (
      <div className="app-container">
        <div className="login-card">
          <h1>Summer Course Booking</h1>
          {errorMsg && <div style={{ color: 'var(--accent-rose)', marginBottom: '1rem', fontSize: '0.875rem' }}>{errorMsg}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Student Name (學生姓名)</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. 張三"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label>Birthday (生日 YYYYMMDD)</label>
              <input
                type="text"
                value={birthdayInput}
                onChange={(e) => setBirthdayInput(e.target.value)}
                placeholder="e.g. 20180815"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label>Parent Phone (家長電話)</label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 0912345678"
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Enter Dashboard'}
            </button>
          </form>
        </div>

        {showRegConfirm && (
          <div className="dialog-overlay">
            <div className="dialog-box">
              <h2>Student Not Found</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
                This student is not registered yet. Would you like to register now using these details?
              </p>
              <div className="dialog-actions">
                <button className="dialog-btn confirm" onClick={handleConfirmRegister}>
                  Yes, Register
                </button>
                <button className="dialog-btn cancel" onClick={() => setShowRegConfirm(false)}>
                  No, Cancel
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
          <h1>Summer School Dashboard</h1>
          <div className="profile-stats">
            <div className="stat-badge">
              Welcome, <strong>{student.name}</strong>
            </div>
            <div className="stat-badge">
              Bookings: <strong>{myBookingsCount} / 15</strong>
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <div className="companion-controls">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
            }}
          />
          Enable 2-Person Group Booking (兩人同行)
        </label>

        {isCompanionMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="text"
              className="form-group"
              style={{ margin: 0, padding: '0.5rem', width: '200px' }}
              placeholder="Companion Name"
              value={companionName}
              onChange={handleCompanionChange}
            />
            {isCompanionVerified && (
              <span style={{ color: 'var(--accent-emerald)', fontSize: '0.875rem', fontWeight: 600 }}>
                Verified (10% Discount Unlocked!)
              </span>
            )}
            {companionError && (
              <span style={{ color: 'var(--accent-rose)', fontSize: '0.875rem', fontWeight: 600 }}>
                {companionError}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="calendar-section">
        <h2>Weekly Class Schedule</h2>
        <div className="calendar-grid">
          <div className="grid-header">Mon (一)</div>
          <div className="grid-header">Tue (二)</div>
          <div className="grid-header">Wed (三)</div>
          <div className="grid-header">Thu (四)</div>
          <div className="grid-header">Fri (五)</div>

          {WEEKS_DATA.flatMap((week, weekIdx) =>
            week.map((dateStr) => {
              const dateParts = dateStr.split('-');
              const displayDate = `${dateParts[1]}/${dateParts[2]}`;
              const isPython = PYTHON_WEEK.includes(dateStr);
              const slots = bookingData[dateStr] || [];
              const myBooking = slots.find((s) => s.studentName === student.name);

              let cellClass = 'date-cell';
              let actionElement = null;
              let slotText = '';

              if (isPython) {
                cellClass += ' python-reserved';
                slotText = 'Python Week';
              } else if (myBooking) {
                cellClass += ' my-booking';
                const companionText =
                  myBooking.bookingType === 'companion' && myBooking.companionName
                    ? ` (with ${myBooking.companionName})`
                    : '';
                slotText = `Booked${companionText}`;
                actionElement = (
                  <button className="cancel-btn" onClick={() => handleCancel(dateStr)}>
                    Cancel
                  </button>
                );
              } else if (slots.length >= 2) {
                cellClass += ' fully-booked';
                slotText = 'Fully Booked (已額滿)';
              } else {
                const remaining = 2 - slots.length;
                if (isCompanionMode) {
                  if (remaining < 2) {
                    slotText = 'Needs 2 slots';
                  } else {
                    slotText = `$1,800/ea (${remaining} left)`;
                    actionElement = (
                      <button
                        className="cell-btn"
                        onClick={() => handleBook(dateStr)}
                        disabled={!isCompanionVerified}
                      >
                        Book Group
                      </button>
                    );
                  }
                } else {
                  slotText = `$2,000 (${remaining} left)`;
                  actionElement = (
                    <button className="cell-btn" onClick={() => handleBook(dateStr)}>
                      Book Now
                    </button>
                  );
                }
              }

              return (
                <div
                  key={dateStr}
                  className={cellClass}
                  data-tooltip={isPython ? 'Python' : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="date-number">{displayDate}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      W{weekIdx + 1}
                    </span>
                  </div>
                  <div className="slot-indicator">{slotText}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{actionElement}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
