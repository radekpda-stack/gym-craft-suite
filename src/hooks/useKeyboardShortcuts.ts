import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useAppShortcuts(callbacks: {
  onNewTraining?: () => void;
  onNewClient?: () => void;
  onSearch?: () => void;
}) {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'g',
      action: () => navigate('/'),
      description: 'Přejít na Dashboard',
    },
    {
      key: 'c',
      action: () => navigate('/clients'),
      description: 'Přejít na Klienty',
    },
    {
      key: 't',
      action: () => navigate('/trainings'),
      description: 'Přejít na Tréninky',
    },
    {
      key: 'a',
      action: () => navigate('/ai-assistant'),
      description: 'Přejít na AI Asistenta',
    },
    ...(callbacks.onNewTraining ? [{
      key: 'n',
      ctrl: true,
      action: callbacks.onNewTraining,
      description: 'Nový trénink',
    }] : []),
    ...(callbacks.onNewClient ? [{
      key: 'n',
      ctrl: true,
      shift: true,
      action: callbacks.onNewClient,
      description: 'Nový klient',
    }] : []),
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

export const allShortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Globální vyhledávání' },
  { keys: ['G'], description: 'Dashboard' },
  { keys: ['C'], description: 'Klienti' },
  { keys: ['T'], description: 'Tréninky' },
  { keys: ['A'], description: 'AI Asistent' },
  { keys: ['Ctrl', 'N'], description: 'Nový trénink' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'Nový klient' },
  { keys: ['?'], description: 'Zobrazit zkratky' },
];
