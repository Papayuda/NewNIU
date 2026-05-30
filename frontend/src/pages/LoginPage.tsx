import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { login, getSavedCredentials } from '../api';
import { useAuth } from '../context/AuthContext';

const COUNTRY_CODES = [
  { code: '1', label: 'US/CA (+1)' },
  { code: '44', label: 'UK (+44)' },
  { code: '49', label: 'DE (+49)' },
  { code: '33', label: 'FR (+33)' },
  { code: '34', label: 'ES (+34)' },
  { code: '39', label: 'IT (+39)' },
  { code: '31', label: 'NL (+31)' },
  { code: '43', label: 'AT (+43)' },
  { code: '41', label: 'CH (+41)' },
  { code: '86', label: 'CN (+86)' },
  { code: '91', label: 'IN (+91)' },
  { code: '81', label: 'JP (+81)' },
  { code: '82', label: 'KR (+82)' },
  { code: '61', label: 'AU (+61)' },
  { code: '55', label: 'BR (+55)' },
  { code: '52', label: 'MX (+52)' },
];

export default function LoginPage() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('1');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedHash, setSavedHash] = useState(false);
  const storedHashRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();

  useEffect(() => {
    getSavedCredentials().then((creds) => {
      if (creds) {
        setAccount(creds.account);
        setCountryCode(creds.countryCode);
        setSavedHash(creds.isHashed);
        if (creds.isHashed) storedHashRef.current = creds.password;
      }
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const isPreHashed = savedHash || (storedHashRef.current !== null && password === storedHashRef.current);
      await login(account, password, countryCode, isPreHashed);
      setAuthenticated(true);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 safe-area-top">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-niu-red to-niu-cyan mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-niu-red/20">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">NIU Controller</h1>
          <p className="text-text-muted">Connect to your NIU vehicles</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-dark-800 rounded-2xl p-8 border border-dark-600 shadow-2xl"
        >
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Country Code
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-niu-cyan transition-colors"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email / Phone / Username
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="your@email.com"
                required
                autoCapitalize="off"
                autoCorrect="off"
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-niu-cyan transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setSavedHash(false); }}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:border-niu-cyan transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-gradient-to-r from-niu-red to-niu-red-dark text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect to NIU Cloud'
            )}
          </button>

          <p className="text-center text-text-muted text-xs mt-6">
            Credentials are stored locally on this device. Data is sent directly to NIU servers.
          </p>
        </form>
      </div>
    </div>
  );
}
