import { ConfigProvider, theme } from 'antd';
import { AppShell } from '@/components/layout/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: 'var(--accent-primary, #6366f1)',
          colorBgContainer: 'var(--card, #111827)',
          colorBorder: 'var(--border, #374151)',
        },
      }}
    >
      <AppShell>{children}</AppShell>
    </ConfigProvider>
  );
}
