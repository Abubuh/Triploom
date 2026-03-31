import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Document } from "../types/trip.types";

export function useDocuments(tripId: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [tripId]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (data) setDocuments(data);
    setLoading(false);
  };

  const addLink = async (
    doc: Omit<Document, "id" | "created_at" | "user_id">,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .insert({ ...doc, user_id: user.id })
      .select()
      .single();

    if (!error && data) setDocuments((prev) => [data, ...prev]);
  };

  const uploadFile = async (file: File, tripId: string, category: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${tripId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("trip-documents")
      .upload(path, file);

    if (uploadError) return;

    const { data: urlData } = supabase.storage
      .from("trip-documents")
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from("documents")
      .insert({
        trip_id: tripId,
        user_id: user.id,
        name: file.name,
        type: "file",
        url: urlData.publicUrl,
        category,
      })
      .select()
      .single();

    if (!error && data) setDocuments((prev) => [data, ...prev]);
  };

  const deleteDocument = async (docId: string, url: string, type: string) => {
    if (type === "file") {
      // Extraer path del storage desde la URL
      const path = url.split("/trip-documents/")[1];
      if (path) {
        await supabase.storage.from("trip-documents").remove([path]);
      }
    }

    const { error } = await supabase.from("documents").delete().eq("id", docId);

    if (!error) setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Agrupa por categoría
  const documentsByCategory = documents.reduce(
    (acc, d) => {
      if (!acc[d.category]) acc[d.category] = [];
      acc[d.category].push(d);
      return acc;
    },
    {} as Record<string, Document[]>,
  );

  return {
    documents,
    documentsByCategory,
    loading,
    addLink,
    uploadFile,
    deleteDocument,
  };
}
