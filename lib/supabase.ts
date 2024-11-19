import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureCompanyLogosBucket() {
  try {
    // First check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketName = 'company-logos';
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
      // Try to create the bucket with public access and no RLS
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 2097152, // 2MB in bytes
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }

      // Set bucket to public and disable RLS
      const { error: updateError } = await supabase.rpc('update_storage_bucket', {
        id: bucketName,
        options: {
          public: true,
          file_size_limit: 2097152,
          allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif'],
          owner: 'authenticated',
          public_access: true,
          security_level: 'public'
        }
      });

      if (updateError) {
        console.error('Error updating bucket settings:', updateError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring bucket:', error);
    return false;
  }
}