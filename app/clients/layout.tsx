import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar className="w-64 border-r" />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}