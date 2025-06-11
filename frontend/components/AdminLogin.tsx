import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 환경변수에서 관리자 계정 정보 가져오기
  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || 'admin';
  const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PW || 'knou2024!';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 약간의 지연으로 로딩 효과
    setTimeout(() => {
      if (id === ADMIN_ID && password === ADMIN_PW) {
        // 세션 스토리지에 로그인 상태 저장
        sessionStorage.setItem('admin_logged_in', 'true');
        sessionStorage.setItem('admin_login_time', new Date().getTime().toString());
        onLogin();
      } else {
        setError('잘못된 아이디 또는 비밀번호입니다.');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-knou-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-4xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-knou-600 mb-2">asKNOU 관리자</h1>
          <p className="text-gray-600">관리자 로그인이 필요합니다</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                id="id"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="input-field w-full"
                placeholder="관리자 아이디를 입력하세요"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="비밀번호를 입력하세요"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !id.trim() || !password.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              관리자 계정이 필요합니다. 문의: 관리자
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 