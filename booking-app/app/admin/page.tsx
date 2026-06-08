'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session === 'admin_token_validated') {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('admin_session', data.token);
        router.push('/admin/dashboard');
      } else {
        setError(data.error === 'invalid_password' ? '密碼錯誤。' : '登入失敗，請稍後再試。');
      }
    } catch {
      setError('無法連接到伺服器。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="login-card">
        <h1>管理者後台登入</h1>
        {error && (
          <div style={{ color: 'var(--accent-rose)', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>請輸入管理員密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼"
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '處理中...' : '登入後台'}
          </button>
        </form>
      </div>
    </div>
  );
}
