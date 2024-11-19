'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  FileText,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ensureCompanyLogosBucket } from '@/lib/supabase';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Sessió tancada',
        description: 'Has tancat la sessió correctament.',
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut tancar la sessió.',
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        throw new Error('El fitxer ha de ser una imatge');
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('La imatge no pot superar els 2MB');
      }

      setIsUploading(true);

      // Ensure bucket exists
      const bucketReady = await ensureCompanyLogosBucket();
      if (!bucketReady) {
        throw new Error('No s\'ha pogut preparar l\'emmagatzematge');
      }

      const bucketName = 'company-logos';

      // Delete existing logos
      const { data: existingLogos, error: listError } = await supabase.storage
        .from(bucketName)
        .list();

      if (listError) throw listError;

      if (existingLogos && existingLogos.length > 0) {
        await Promise.all(
          existingLogos.map(logo =>
            supabase.storage
              .from(bucketName)
              .remove([logo.name])
          )
        );
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Update company settings
      const { data: settings, error: settingsError } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (settingsError && !settingsError.message.includes('No rows found')) {
        throw settingsError;
      }

      if (settings) {
        const { error: updateError } = await supabase
          .from('company_settings')
          .update({ logo_url: publicUrl })
          .eq('id', settings.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('company_settings')
          .insert([{ 
            company_name: 'My Company',
            logo_url: publicUrl,
            review_percentage: 15
          }]);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Logo actualitzat',
        description: 'El logo s\'ha pujat correctament.',
      });
      
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No s\'ha pogut pujar el logo.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const menuItems = [
    {
      icon: BarChart,
      label: 'Stats',
      href: '/',
    },
    {
      icon: FileText,
      label: 'Control Facturació',
      href: '/facturacio',
    },
    {
      icon: Users,
      label: 'Clients',
      href: '/clients',
    },
  ];

  return (
    <div className={cn('pb-12 min-h-screen flex flex-col bg-primary/5', className)}>
      <div className="space-y-4 py-4 flex-grow">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  pathname === item.href && "bg-primary/10 hover:bg-primary/15"
                )}
                onClick={() => router.push(item.href)}
              >
                <item.icon className={cn(
                  "mr-2 h-4 w-4",
                  pathname === item.href ? "text-primary" : "text-primary/60"
                )} />
                {item.label}
              </Button>
            ))}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-primary/10"
                >
                  <Settings className="mr-2 h-4 w-4 text-primary/60" />
                  Configuració
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configuració del Logo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo">Pujar Logo</Label>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground">
                        Format: PNG, JPG, GIF (màx. 2MB)
                      </p>
                    </div>
                    {isUploading && (
                      <p className="text-sm text-muted-foreground animate-pulse">
                        Pujant logo...
                      </p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="px-3 mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Tancar sessió
        </Button>
      </div>
    </div>
  );
}