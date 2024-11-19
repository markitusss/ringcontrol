import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar className="w-64 border-r" />
        <main className="flex-1 p-8">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Panell de Control</h1>
              <p className="text-muted-foreground">
                Benvingut al sistema de facturació
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}