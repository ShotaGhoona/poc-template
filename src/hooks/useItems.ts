/**
 * サンプルCRUDフック - Lovableパターン
 *
 * このファイルをコピーして新しいエンティティのフックを作成してください。
 * 手順：
 *   1. ファイル名を useXxx.ts に変更
 *   2. "items" を対象のテーブル名に置換
 *   3. 型定義を調整
 *   4. 必要に応じてクエリのselect文を変更（JOINなど）
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ============================================
// 型定義（supabase gen types で自動生成した型に置き換え可能）
// ============================================

export interface Item {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// クエリ（読み取り）
// ============================================

/** アイテム一覧を取得 */
export function useItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!user,
  });
}

/** 単一アイテムを取得 */
export function useItem(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Item;
    },
    enabled: !!user && !!id,
  });
}

// ============================================
// ミューテーション（書き込み）
// ============================================

/** アイテムを作成 */
export function useCreateItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const { data, error } = await supabase
        .from("items")
        .insert({
          ...input,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

/** アイテムを更新 */
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      title?: string;
      description?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["items", variables.id] });
    },
  });
}

/** アイテムを削除 */
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
