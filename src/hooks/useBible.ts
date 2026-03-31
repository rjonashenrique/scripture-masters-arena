import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDailyVerse() {
  return useQuery({
    queryKey: ['daily-verse', new Date().toDateString()],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bible-api', {
        body: { action: 'daily-verse' },
      });
      if (error) throw error;
      return data as { reference: string; text: string; verses: { verse: number; text: string }[] };
    },
    staleTime: 1000 * 60 * 60, // 1h
  });
}

export function useBibleChapter(book: string, chapter: number) {
  return useQuery({
    queryKey: ['bible-chapter', book, chapter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bible-api', {
        body: { action: 'chapter', book, chapter },
      });
      if (error) throw error;
      return data as { reference: string; text: string; verses: { verse: number; text: string }[] };
    },
    enabled: !!book && chapter > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });
}

export function useDevotional() {
  return useQuery({
    queryKey: ['devotional', new Date().toDateString()],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bible-api', {
        body: { action: 'devotional' },
      });
      if (error) throw error;
      return data as {
        verse: { reference: string; text: string };
        devotional: { titulo: string; reflexao: string; oracao: string };
      };
    },
    staleTime: 1000 * 60 * 60 * 4, // 4h
  });
}
