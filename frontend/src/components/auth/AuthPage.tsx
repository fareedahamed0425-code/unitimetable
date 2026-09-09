import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  GraduationCap,
  Sparkles,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Building2,
  Users
} from 'lucide-react';
import { api } from '../../api';
import { RoleType, User as UserType } from '../../../../shared/types';

interface AuthPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RoleType>('STUDENT');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      setSuccessMsg(`Welcome back, ${res.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role
      });
      setSuccessMsg('Account created successfully!');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('admin@apollouniversity.edu.in');
    setPassword('Admin@1234');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col justify-center items-center px-4 py-8 text-[#002E4E]">
      {/* Background Decorative Blur Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#2582A1]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-[#FDB931]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* University Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-white shadow-sm border border-[#D8E6ED] mb-1">
            <img
              src="/Apollo Vector image.svg"
              alt="The Apollo University"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#002E4E]">
            The Apollo University
          </h1>
          <p className="text-xs text-[#4A6375] font-medium">
            Automated Academic Scheduling & Timetable Platform
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-xl p-6 sm:p-8 space-y-6">
          {/* Tab Switcher */}
          <div className="flex bg-[#F4F8FA] p-1 rounded-xl border border-[#D8E6ED]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'LOGIN'
                  ? 'bg-white text-[#002E4E] shadow-sm'
                  : 'text-[#4A6375] hover:text-[#002E4E]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('REGISTER');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'REGISTER'
                  ? 'bg-white text-[#002E4E] shadow-sm'
                  : 'text-[#4A6375] hover:text-[#002E4E]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          {activeTab === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#002E4E]">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@apollouniversity.edu.in"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#002E4E]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#002E4E] hover:bg-[#1C6982] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Admin Credentials Fill Button */}
              <div className="pt-2 border-t border-[#D8E6ED] text-center">
                <button
                  type="button"
                  onClick={fillAdminCredentials}
                  className="text-[11px] font-semibold text-[#2582A1] hover:text-[#002E4E] inline-flex items-center gap-1.5 bg-[#E8F4F8] hover:bg-[#D4ECF4] px-3 py-1.5 rounded-lg transition-colors border border-[#CCDDE7]"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Use Official Admin Credentials</span>
                </button>
              </div>
            </form>
          )}

          {/* Create Account Form */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#002E4E]">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dr. Alan Turing / Alex Johnson"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#002E4E]">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@apollouniversity.edu.in"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#002E4E]">
                  University Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as RoleType)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E] cursor-pointer"
                >
                  <option value="STUDENT">Student (Class Routine & Enrolled Courses)</option>
                  <option value="FACULTY">Faculty Member (Teaching Schedule & Availability)</option>
                  <option value="TIMETABLE_COORDINATOR">Timetable Coordinator (AI Wizard & Scheduling)</option>
                  <option value="DEPARTMENT_ADMIN">Head of Department (HOD CSE/ECE)</option>
                  <option value="UNIVERSITY_ADMIN">Dean of Academic Affairs</option>
                  <option value="SUPER_ADMIN">Super Administrator (Root Console)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#002E4E]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#002E4E]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] focus:border-[#2582A1] focus:bg-white focus:outline-none transition-all text-[#002E4E]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#FDB931] hover:bg-[#EAA319] text-[#002E4E] text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer mt-2"
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-[#829BA8] space-y-1">
          <div>The Apollo University • Murukambattu, Chittoor - 517127, AP, India</div>
          <div>Protected by institutional single sign-on & multi-role governance.</div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
