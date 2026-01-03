import { useState, useRef } from 'react';
import { Camera, Video, X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChallengeMediaUploadProps {
  onMediaUploaded: (urls: string[]) => void;
  existingUrls?: string[];
  maxPhotos?: number;
  maxVideos?: number;
  disabled?: boolean;
}

export function ChallengeMediaUpload({
  onMediaUploaded,
  existingUrls = [],
  maxPhotos = 3,
  maxVideos = 1,
  disabled = false,
}: ChallengeMediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string; type: 'photo' | 'video' }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const photoCount = pendingFiles.filter(f => f.type === 'photo').length;
  const videoCount = pendingFiles.filter(f => f.type === 'video').length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = maxPhotos - photoCount;
    const toAdd = Array.from(files).slice(0, remaining);

    const newFiles = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: 'photo' as const,
    }));

    setPendingFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || videoCount >= maxVideos) return;

    const file = files[0];
    
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Video je příliš velké. Max 50MB.');
      return;
    }

    setPendingFiles(prev => [
      ...prev,
      {
        file,
        preview: URL.createObjectURL(file),
        type: 'video',
      },
    ]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadAllFiles = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const { file, type } of pendingFiles) {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
        const filePath = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('challenge-media')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('challenge-media')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Clear pending files
      pendingFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setPendingFiles([]);
      
      onMediaUploaded([...existingUrls, ...uploadedUrls]);
      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  };

  // Expose upload function via ref or just return the function
  // For simplicity, we'll make it so parent calls this component's state
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
          disabled={disabled || photoCount >= maxPhotos}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoSelect}
          className="hidden"
          disabled={disabled || videoCount >= maxVideos}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => photoInputRef.current?.click()}
          disabled={disabled || photoCount >= maxPhotos}
        >
          <Camera className="h-4 w-4 mr-2" />
          Fotka ({photoCount}/{maxPhotos})
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled || videoCount >= maxVideos}
        >
          <Video className="h-4 w-4 mr-2" />
          Video ({videoCount}/{maxVideos})
        </Button>
      </div>

      {/* Preview Grid */}
      {pendingFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {pendingFiles.map((item, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {item.type === 'photo' ? (
                <img
                  src={item.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={item.preview}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
              {item.type === 'video' && (
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-[10px] text-white">
                  VIDEO
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Nahrávám média...
        </div>
      )}
    </div>
  );
}

// Export a hook-like function for parent to trigger upload
export function useChallengeMediaUpload() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of files) {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'bin';
        const filePath = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('challenge-media')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('challenge-media')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFiles, uploading };
}
