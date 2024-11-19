'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    const getLogo = async () => {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('logo_url')
        .limit(1)
        .single();

      if (settings?.logo_url) {
        setLogoUrl(settings.logo_url);
      }
    };

    getUser();
    getLogo();

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'company_settings'
      }, () => {
        getLogo();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <header className="border-b bg-white dark:bg-gray-950 shadow-sm">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-12 w-auto object-contain" // Increased from h-8 to h-11 (approximately 40% larger)
            />
          ) : (
            <FileText className="h-8 w-8 text-primary" />
          )}
        </div>
        {user && (
          <div className="ml-auto flex items-center gap-4">
            <ThemeSwitcher />
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  );
}