import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Task, Dossier } from '../types';
import { apiService, setCurrentAuthUserId, setCurrentAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  register: (data: { name: string; username: string; email: string; phone?: string; position?: string }) => Promise<string>;
  logout: () => void;
  switchUser: (user: User) => void;
  isAdmin: boolean;
  isLeader: boolean;
  isSpecialist: boolean;
  isClerk: boolean;
  canViewAllTasks: boolean;
  canAssignTasks: boolean;
  canEditTask: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  canEditDossier: (dossier: Dossier) => boolean;
  canDeleteDossier: (dossier?: Dossier | null) => boolean;
  canModifyRecord: (record?: any) => boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'qlcv_auth_user';

export const defaultOfficerUser: User = {
  id: 'user_hoaivu',
  name: 'Đoàn Văn Hoài Vũ',
  username: 'vudvh',
  email: 'vudvh@danang.gov.vn',
  role: 'admin',
  status: 'active',
  approved: true,
  position: 'Chuyên viên Đất đai / Quản trị viên (Admin - Quyết định tất cả)',
  phone: '0968489024',
  gender: 'male',
  avatar: '',
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-08-21T08:00:00.000Z',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      const storedToken = localStorage.getItem('qlcv_auth_token');
      if (stored && storedToken) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.username || parsed.id?.startsWith('user_'))) {
          setUser(parsed);
          setCurrentAuthUserId(parsed.id || '');
          setCurrentAuthToken(storedToken);
        } else {
          setUser(null);
          setCurrentAuthUserId('');
          setCurrentAuthToken('');
        }
      } else {
        // Do not auto-login on fresh machines so other officers can login with their own accounts
        setUser(null);
        setCurrentAuthUserId('');
        setCurrentAuthToken('');
      }
    } catch (e) {
      console.error('Error loading stored user:', e);
      setUser(null);
      setCurrentAuthUserId('');
      setCurrentAuthToken('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password?: string) => {
    const res = await apiService.login(username, password);
    setUser(res.user);
    setCurrentAuthUserId(res.user?.id || '');
    if (res.token) {
      setCurrentAuthToken(res.token);
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(res.user));
    } catch {}
  };

  const register = async (data: { name: string; username: string; email: string; phone?: string; position?: string }) => {
    const res = await apiService.register(data);
    return res.message;
  };

  const logout = () => {
    setUser(null);
    setCurrentAuthUserId('');
    setCurrentAuthToken('');
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      localStorage.removeItem('qlcv_auth_token');
    } catch {}
  };

  const switchUser = (newUser: User) => {
    setUser(newUser);
    setCurrentAuthUserId(newUser?.id || '');
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
    } catch {}
  };

  const isAdmin = user?.role === 'admin';
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const isSpecialist = user?.role === 'specialist';
  const isClerk = user?.role === 'clerk';
  const canManageUsers = isAdmin;
  const canViewAllTasks = Boolean(isAdmin || isLeader);
  const canAssignTasks = Boolean(isAdmin || isLeader);

  const canEditTask = (_task: Task): boolean => {
    if (!user) return false;
    return isAdmin || isLeader;
  };

  const canDeleteTask = (_task: Task): boolean => {
    if (!user) return false;
    return isAdmin || isLeader;
  };

  const canModifyRecord = (record?: any): boolean => {
    if (!user) return false;
    if (isAdmin || isLeader) return true;
    if (!record) return false;

    const normalize = (s?: string) => (s || '').trim().toLowerCase();
    const userNameNorm = normalize(user.name);

    const primaryId = record.handlerId || record.managerId || record.ownerId || record.assigneeId;
    const primaryName = record.handlerName || record.managerName || record.ownerName || record.assigneeName;

    if (primaryId) {
      if (primaryId === user.id) return true;
      if (primaryName && userNameNorm && normalize(primaryName) === userNameNorm) return true;
      return false;
    }

    if (primaryName && userNameNorm) {
      return normalize(primaryName) === userNameNorm;
    }

    if (record.createdBy) {
      if (record.createdBy === user.id) return true;
      if (record.createdByName && userNameNorm && normalize(record.createdByName) === userNameNorm) return true;
      return false;
    }

    return false;
  };

  const canEditDossier = (dossier: Dossier): boolean => {
    return canModifyRecord(dossier);
  };

  const canDeleteDossier = (dossier?: Dossier | null): boolean => {
    if (!user) return false;
    if (isAdmin || isLeader) return true;
    if (!dossier) return false;
    return canModifyRecord(dossier);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && user.status === 'active' && user.approved),
        isLoading,
        login,
        register,
        logout,
        switchUser,
        isAdmin,
        isLeader,
        isSpecialist,
        isClerk,
        canViewAllTasks,
        canAssignTasks,
        canEditTask,
        canDeleteTask,
        canEditDossier,
        canDeleteDossier,
        canModifyRecord,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
