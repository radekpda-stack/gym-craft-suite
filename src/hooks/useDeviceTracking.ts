import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DEVICE_LIMIT = 3;

// Generate a unique device ID based on browser fingerprint
function generateDeviceId(): string {
  const nav = window.navigator;
  const screen = window.screen;
  
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Neznámé zařízení';
}

export function useDeviceTracking() {
  const { user } = useAuth();
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    const checkAndRegisterDevice = async () => {
      try {
        const deviceId = generateDeviceId();
        const deviceName = getDeviceName();

        // Check if this device already exists
        const { data: existingDevice, error: checkError } = await supabase
          .from('user_devices')
          .select('id')
          .eq('user_id', user.id)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking device:', checkError);
          setIsChecking(false);
          return;
        }

        if (existingDevice) {
          // Device exists, update last_seen
          await supabase
            .from('user_devices')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', existingDevice.id);
          
          setIsChecking(false);
          return;
        }

        // Check device count
        const { count, error: countError } = await supabase
          .from('user_devices')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error('Error counting devices:', countError);
          setIsChecking(false);
          return;
        }

        if ((count ?? 0) >= DEVICE_LIMIT) {
          setDeviceError(`Překročen limit zařízení (max ${DEVICE_LIMIT}). Odhlaste se z jiného zařízení nebo kontaktujte podporu.`);
          setIsChecking(false);
          return;
        }

        // Register new device
        const { error: insertError } = await supabase
          .from('user_devices')
          .insert({
            user_id: user.id,
            device_id: deviceId,
            device_name: deviceName,
          });

        if (insertError) {
          // Might be a race condition - device already exists
          if (insertError.code === '23505') {
            // Unique violation - device already registered
            await supabase
              .from('user_devices')
              .update({ last_seen: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('device_id', deviceId);
          } else {
            console.error('Error registering device:', insertError);
          }
        }

        setIsChecking(false);
      } catch (err) {
        console.error('Device tracking error:', err);
        setIsChecking(false);
      }
    };

    checkAndRegisterDevice();
  }, [user]);

  return {
    deviceError,
    isChecking,
    deviceLimit: DEVICE_LIMIT,
  };
}
