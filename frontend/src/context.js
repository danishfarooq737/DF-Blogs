import { createContext, useContext } from 'react';

export const AuthCtx = createContext({ user: null, setUser: () => {}, logout: async () => {} });
export const SiteCtx = createContext({ site: { name: 'DF Blogs' }, analytics: { provider: 'none' } });
export const ToastCtx = createContext({ notify: () => {} });

export const useAuth = () => useContext(AuthCtx);
export const useSite = () => useContext(SiteCtx);
export const useToast = () => useContext(ToastCtx);
