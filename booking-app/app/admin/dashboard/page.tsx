'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session !== 'admin_token_validated') {
      router.push('/admin');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    router.push('/admin');
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
      <div className="dashboard-header">
        <div>
          <h1>管理者後台管理系統</h1>
          <p style={{ color: 'var(--text-secondary)' }}>歡迎回來，管理員</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          登出後台
        </button>
      </div>
      <div>Scaffolded Dashboard</div>
    </div>
  );
}
