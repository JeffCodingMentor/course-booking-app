'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const WEEKS_DATA = [
  ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'],
  ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'],
  ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
  ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'],
  ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'],
  ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']
];

const PYTHON_WEEK = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'];

interface BookingSlot {
  studentName: string;
  parentPhone: string;
  bookingType: 'single' | 'companion';
  companionName: string | null;
  fee: number;
  bookedAt: string;
}

interface StudentInfo {
  name: string;
  birthday: string;
  parentPhone: string;
  totalDays: number;
  totalFee: number;
  bookings: { date: string; bookingType: string; companionName: string | null; fee: number }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'roster'>('calendar');
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [bookingData, setBookingData] = useState<Record<string, BookingSlot[]>>({});
  const [capacityData, setCapacityData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manual Student Registration Form State
  const [regName, setRegName] = useState('');
  const [regBirthday, setRegBirthday] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Expanded student names for Ledger detail drawer
  const [expandedStudents, setExpandedStudents] = useState<string[]>([]);

  // Manual Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookDate, setBookDate] = useState('');
  const [bookStudent, setBookStudent] = useState('');
  const [bookCompanionMode, setBookCompanionMode] = useState(false);
  const [bookCompanionStudent, setBookCompanionStudent] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);

  // Cancel Booking Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelDate, setCancelDate] = useState('');
  const [cancelStudent, setCancelStudent] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Authentication check
  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session !== 'admin_token_validated') {
      router.push('/admin');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true);
    }
  }, [router]);

  // Load roster, bookings, and capacities
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('admin_session') || '';
      const headers = { 'x-admin-token': token };

      // Fetch students roster & tuition summaries
      const resStudents = await fetch('/api/admin/students', { headers });
      if (!resStudents.ok) throw new Error('無法取得學生名冊資料。');
      const dataStudents = await resStudents.json();
      if (dataStudents.success) {
        setStudents(dataStudents.students || []);
      }

      // Fetch booking slots and capacities for all calendar dates
      const allDates = WEEKS_DATA.flat();
      const bData: Record<string, BookingSlot[]> = {};
      const cData: Record<string, number> = {};

      await Promise.all(
        allDates.map(async (date) => {
          try {
            const res = await fetch(`/api/booking/slots?date=${date}`);
            if (res.ok) {
              const json = await res.json();
              bData[date] = json.slots || [];
              cData[date] = typeof json.capacity === 'number' ? json.capacity : 2;
            } else {
              bData[date] = [];
              cData[date] = 2;
            }
          } catch {
            bData[date] = [];
            cData[date] = 2;
          }
        })
      );

      setBookingData(bData);
      setCapacityData(cData);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '載入資料時發生錯誤。';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAllData();
    }
  }, [authorized, fetchAllData]);

  // Show banner message briefly
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => {
      setErrorMsg('');
    }, 4000);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    router.push('/admin');
  };

  // 1. Manual Student Registration
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regBirthday.trim() || !regPhone.trim()) {
      triggerError('請填寫所有欄位。');
      return;
    }
    setRegSubmitting(true);
    try {
      const token = localStorage.getItem('admin_session') || '';
      const res = await fetch('/api/admin/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          name: regName.trim(),
          birthday: regBirthday.trim(),
          parentPhone: regPhone.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerSuccess(`成功註冊學生：${regName}`);
        setRegName('');
        setRegBirthday('');
        setRegPhone('');
        fetchAllData();
      } else {
        triggerError(data.error === 'invalid_inputs' ? '請確認輸入資料是否完整。' : '註冊失敗。');
      }
    } catch {
      triggerError('無法連線至伺服器。');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Toggle expanded state for student details
  const toggleStudentExpanded = (name: string) => {
    setExpandedStudents((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // 2. Capacity Control
  const handleCapacityChange = async (date: string, newCapacity: number) => {
    try {
      const token = localStorage.getItem('admin_session') || '';
      const res = await fetch('/api/admin/capacity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ date, capacity: newCapacity }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCapacityData((prev) => ({ ...prev, [date]: newCapacity }));
        triggerSuccess(`已將 ${date} 的預約容量修改為 ${newCapacity} 人。`);
      } else {
        triggerError('容量修改失敗。');
      }
    } catch {
      triggerError('無法連線至伺服器。');
    }
  };

  // 3. Manual Booking Modal Trigger
  const openManualBooking = (date: string) => {
    setBookDate(date);
    setBookStudent('');
    setBookCompanionMode(false);
    setBookCompanionStudent('');
    setShowBookModal(true);
  };

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookStudent) {
      triggerError('請選擇欲預約的學生。');
      return;
    }
    if (bookCompanionMode && !bookCompanionStudent) {
      triggerError('啟用兩人同行模式時，必須選擇同行者。');
      return;
    }
    setBookSubmitting(true);
    try {
      const token = localStorage.getItem('admin_session') || '';
      const res = await fetch('/api/admin/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          studentName: bookStudent,
          dates: [bookDate],
          isCompanionMode: bookCompanionMode,
          companionName: bookCompanionMode ? bookCompanionStudent : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerSuccess('手動預約新增成功！');
        setShowBookModal(false);
        fetchAllData();
      } else {
        const errorMap: Record<string, string> = {
          insufficient_slots: '剩餘名額不足。',
          already_booked: '該學生已於此日期預約過。',
          companion_already_booked: '同行者已於此日期預約過。',
          booking_limit_exceeded: '學生的預約總天數已達上限(15天)。',
          companion_not_registered: '同行者尚未註冊。',
          date_reserved_for_python: '此日期保留給 Python 程式體驗週。',
        };
        triggerError(errorMap[data.error] || '預約失敗，請重試。');
      }
    } catch {
      triggerError('無法連線至伺服器。');
    } finally {
      setBookSubmitting(false);
    }
  };

  // 4. Manual Cancellation Modal Trigger
  const openManualCancel = (studentName: string, date: string) => {
    setCancelStudent(studentName);
    setCancelDate(date);
    setShowCancelModal(true);
  };

  const handleManualCancelSubmit = async () => {
    setCancelSubmitting(true);
    try {
      const token = localStorage.getItem('admin_session') || '';
      const res = await fetch('/api/admin/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          studentName: cancelStudent,
          date: cancelDate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerSuccess(`已成功取消 ${cancelStudent} 於 ${cancelDate} 的預約。`);
        setShowCancelModal(false);
        fetchAllData();
      } else {
        triggerError('預約取消失敗。');
      }
    } catch {
      triggerError('無法連線至伺服器。');
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (!authorized) {
    return (
      <div className="app-container">
        <p style={{ textAlign: 'center', margin: '4rem 0' }}>驗證中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Jeff 老師管理者後台系統</h1>
          <p style={{ color: 'var(--text-secondary)' }}>設定預約名額、管理學生名單、對帳學費明細</p>
        </div>
        <button className="submit-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem' }} onClick={handleLogout}>
          登出後台
        </button>
      </div>

      {/* Success & Error Banners */}
      {successMsg && <div className="success-banner">{successMsg}</div>}
      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          預約日曆管理 (Calendar)
        </button>
        <button
          className={`admin-tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          學生名冊與對帳單 (Roster & Ledger)
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', margin: '3rem 0', color: 'var(--text-secondary)' }}>
          載入後台資料中...
        </div>
      )}

      {/* Tab Content: Calendar */}
      {!loading && activeTab === 'calendar' && (
        <div>
          <div className="calendar-header-bar">
            <h2>課程預約排程表</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              說明：預設每日容量 2 人。可調整 + / - 覆寫，設為 0 可直接鎖定日期。
            </div>
          </div>

          <div className="grid-headers-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>
            <div>週一</div>
            <div>週二</div>
            <div>週三</div>
            <div>週四</div>
            <div>週五</div>
          </div>

          {WEEKS_DATA.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className="week-group"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}
            >
              {week.map((dateStr, dayIdx) => {
                const dateParts = dateStr.split('-');
                const displayDate = `${dateParts[1]}/${dateParts[2]}`;
                const slots = bookingData[dateStr] || [];
                const capacity = capacityData[dateStr] ?? 2;
                const isPython = PYTHON_WEEK.includes(dateStr);
                const isLocked = capacity === 0;

                let cellBgClass = '';
                if (isPython) cellBgClass = ' python-week';
                else if (isLocked) cellBgClass = ' locked';

                return (
                  <div key={dayIdx} className={`date-cell-admin${cellBgClass}`}>
                    {/* Header: Date and Capacity badge */}
                    <div className="date-cell-admin-header">
                      <div>
                        <span className="date-cell-admin-number">{displayDate}</span>
                        <span className="mobile-weekday" style={{ marginLeft: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {['週一', '週二', '週三', '週四', '週五'][dayIdx]}
                        </span>
                      </div>
                      <div className="date-cell-admin-capacity">
                        {isPython ? (
                          <span className="capacity-badge locked">Python週</span>
                        ) : (
                          <span className={`capacity-badge ${isLocked ? 'locked' : capacity > 2 ? 'increased' : ''}`}>
                            {isLocked ? '已鎖定' : `${slots.length}/${capacity}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Booked Students list */}
                    <div className="date-cell-admin-students">
                      {slots.map((slot, sIdx) => {
                        const isCompanion = slot.bookingType === 'companion';
                        return (
                          <div
                            key={sIdx}
                            className={`admin-student-tag${isCompanion ? ' companion' : ''}`}
                            title={isCompanion && slot.companionName ? `同行者: ${slot.companionName}` : undefined}
                          >
                            <span>{slot.studentName}</span>
                            <button
                              className="delete-student-btn"
                              onClick={() => openManualCancel(slot.studentName, dateStr)}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}

                      {/* Manual Add Button */}
                      {!isPython && slots.length < capacity && (
                        <button
                          className="add-booking-btn-cell"
                          onClick={() => openManualBooking(dateStr)}
                        >
                          + 新增
                        </button>
                      )}
                    </div>

                    {/* Capacity setters (only for non-python experience weeks) */}
                    {!isPython && (
                      <div className="capacity-setter-inline">
                        <label>容量: </label>
                        <button
                          className="capacity-setter-btn"
                          onClick={() => handleCapacityChange(dateStr, Math.max(0, capacity - 1))}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          {capacity}
                        </span>
                        <button
                          className="capacity-setter-btn"
                          onClick={() => handleCapacityChange(dateStr, capacity + 1)}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Roster & Ledger */}
      {!loading && activeTab === 'roster' && (
        <div className="admin-grid">
          {/* Left Side: Register Student Form */}
          <div className="admin-card">
            <h2>手動新增學生</h2>
            <form onSubmit={handleRegisterStudent}>
              <div className="form-group">
                <label>學生姓名</label>
                <input
                  type="text"
                  placeholder="例如：張三"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={regSubmitting}
                  required
                />
              </div>
              <div className="form-group">
                <label>生日 (YYYYMMDD)</label>
                <input
                  type="text"
                  placeholder="例如：20180815"
                  value={regBirthday}
                  onChange={(e) => setRegBirthday(e.target.value)}
                  disabled={regSubmitting}
                  maxLength={8}
                  required
                />
              </div>
              <div className="form-group">
                <label>家長電話</label>
                <input
                  type="text"
                  placeholder="例如：0912345678"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={regSubmitting}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={regSubmitting}>
                {regSubmitting ? '註冊中...' : '確認新增學生'}
              </button>
            </form>
          </div>

          {/* Right Side: Roster and tuition ledgers */}
          <div className="admin-card">
            <h2>學生名冊與學費對帳單</h2>
            {students.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                目前尚無已註冊的學生。
              </div>
            ) : (
              <div className="admin-roster-list">
                {students.map((student) => {
                  const isExpanded = expandedStudents.includes(student.name);
                  return (
                    <div key={student.name} className="student-roster-item">
                      <div
                        className="student-roster-header"
                        onClick={() => toggleStudentExpanded(student.name)}
                      >
                        <div className="student-roster-info">
                          <span className="student-roster-name">{student.name}</span>
                          <span className="student-roster-meta">
                            生日：{student.birthday} | 家長電話：{student.parentPhone}
                          </span>
                        </div>
                        <div className="student-roster-summary">
                          <div className="student-roster-fee">
                            NT$ {student.totalFee.toLocaleString()}
                          </div>
                          <div className="student-roster-days">
                            共上課 {student.totalDays} 天
                          </div>
                        </div>
                      </div>

                      {/* Ledger drawer */}
                      {isExpanded && (
                        <div className="student-roster-details">
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                            上課日期與費用明細
                          </h4>
                          {student.bookings.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0' }}>
                              尚無上課預約紀錄。
                            </p>
                          ) : (
                            <table className="admin-table">
                              <thead>
                                <tr>
                                  <th>預約上課日期</th>
                                  <th>課程預約類型</th>
                                  <th>同行者</th>
                                  <th>學費費用</th>
                                </tr>
                              </thead>
                              <tbody>
                                {student.bookings.map((booking, bIdx) => (
                                  <tr key={bIdx}>
                                    <td style={{ fontWeight: 'bold' }}>{booking.date}</td>
                                    <td>
                                      {booking.bookingType === 'companion' ? '兩人同行' : '單人預約'}
                                    </td>
                                    <td>{booking.companionName || '無'}</td>
                                    <td style={{ color: 'var(--accent-indigo)', fontWeight: '600' }}>
                                      NT$ {booking.fee.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                                <tr style={{ background: '#f5f5f4', fontWeight: 'bold' }}>
                                  <td colSpan={3} style={{ textAlign: 'right' }}>
                                    總計金額：
                                  </td>
                                  <td style={{ color: 'var(--accent-indigo)', fontSize: '0.95rem' }}>
                                    NT$ {student.totalFee.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Booking Dialog Modal */}
      {showBookModal && (
        <div className="dialog-overlay">
          <div className="dialog-box" style={{ maxWidth: '450px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--accent-indigo)' }}>
              手動新增預約 - {bookDate}
            </h3>
            <form onSubmit={handleManualBookingSubmit}>
              <div className="modal-form-group">
                <label>選擇預約學生</label>
                <select
                  value={bookStudent}
                  onChange={(e) => setBookStudent(e.target.value)}
                  required
                >
                  <option value="">-- 請選擇學生 --</option>
                  {students.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.parentPhone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1.25rem 0' }}>
                <input
                  type="checkbox"
                  id="chkCompanion"
                  checked={bookCompanionMode}
                  onChange={(e) => setBookCompanionMode(e.target.checked)}
                  style={{ width: 'auto', margin: '0' }}
                />
                <label htmlFor="chkCompanion" style={{ margin: '0', cursor: 'pointer' }}>
                  兩人同行模式 (折抵為 $2,700)
                </label>
              </div>

              {bookCompanionMode && (
                <div className="modal-form-group">
                  <label>選擇同行者</label>
                  <select
                    value={bookCompanionStudent}
                    onChange={(e) => setBookCompanionStudent(e.target.value)}
                    required={bookCompanionMode}
                  >
                    <option value="">-- 請選擇同行者 --</option>
                    {students
                      .filter((s) => s.name !== bookStudent)
                      .map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="dialog-actions">
                <button
                  type="button"
                  className="dialog-btn cancel"
                  onClick={() => setShowBookModal(false)}
                  disabled={bookSubmitting}
                >
                  取消
                </button>
                <button type="submit" className="dialog-btn confirm" disabled={bookSubmitting}>
                  {bookSubmitting ? '處理中...' : '確認新增預約'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Dialog Modal */}
      {showCancelModal && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent-rose)' }}>取消預約確認</h3>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
              您確定要手動取消 <strong>{cancelStudent}</strong> 於 <strong>{cancelDate}</strong> 的上課預約嗎？
              <br />
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                * 若此為兩人同行預約，將會同步取消同行者的該日預約。
              </span>
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn cancel"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelSubmitting}
              >
                保留預約
              </button>
              <button
                type="button"
                className="dialog-btn confirm"
                style={{ backgroundColor: 'var(--accent-rose)' }}
                onClick={handleManualCancelSubmit}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? '處理中...' : '確定取消預約'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
