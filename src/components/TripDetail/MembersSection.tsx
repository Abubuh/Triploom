import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Trip, Member } from "../../types/trip.types";
import { PreferencesModal } from "./PreferencesModal";
import GroupIcon from "../Icons/GroupIcon";
import CrownIcon from "../Icons/CrownIcon";
import CoOrganizerIcon from "../Icons/CoOrganizerIcon";
import PlaneIcon from "../Icons/PlaneIcon";
import EditIcon from "../Icons/EditIcon";
import PinIcon from "../Icons/PinIcon";

interface Props {
  trip: Trip;
  members: Member[];
  isOwner: boolean;
  currentUserId: string | null;
  currentUserRole: string | null;
  userCurrency: string;
  onMembersChange: (members: Member[]) => void;
  showToast: (message: string) => void;
}

export function MembersSection({
  trip,
  members,
  isOwner,
  currentUserId,
  currentUserRole,
  userCurrency,
  onMembersChange,
  showToast,
}: Props) {
  const navigate = useNavigate();
  const [roleMenuOpenFor, setRoleMenuOpenFor] = useState<string | null>(null);
  const [editingPrefs, setEditingPrefs] = useState(false);

  const handleCopyInviteLink = async () => {
    const { data, error } = await supabase
      .from("trip_invitations")
      .insert({ trip_id: trip.id, created_by: currentUserId })
      .select("token")
      .single();

    if (error || !data) return;

    const link = `${window.location.origin}/invite/${data.token}`;
    await navigator.clipboard.writeText(link);
    showToast("¡Link copiado! Compártelo con quien quieras invitar.");
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!confirm("¿Seguro que quieres remover a este viajero?")) return;

    await supabase
      .from("member_preferences")
      .delete()
      .eq("trip_id", trip.id)
      .eq("user_id", memberUserId);

    await supabase.from("trip_members").delete().eq("id", memberId);

    onMembersChange(members.filter((m) => m.id !== memberId));
  };

  const handleChangeRole = async (
    memberId: string,
    newRole: "co-organizer" | "traveler",
  ) => {
    const { error } = await supabase
      .from("trip_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) return;

    onMembersChange(
      members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
    );
    setRoleMenuOpenFor(null);
  };

  const handleLeaveTrip = async () => {
    if (!confirm("¿Seguro que quieres salir de este viaje?")) return;

    const member = members.find((m) => m.user_id === currentUserId);
    if (!member) return;

    await supabase
      .from("member_preferences")
      .delete()
      .eq("trip_id", trip.id)
      .eq("user_id", currentUserId!);

    await supabase.from("trip_members").delete().eq("id", member.id);

    navigate("/dashboard");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex gap-1 items-center">
          <GroupIcon /> Viajeros
        </h3>
        {isOwner && (
          <button
            onClick={handleCopyInviteLink}
            className="text-blue-400 hover:text-blue-300 text-sm transition"
          >
            + Invitar persona
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => (
          <div key={m.id} className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{m.profiles?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs flex gap-2 items-center px-3 py-1 rounded-full font-medium ${
                    m.role === "owner"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : m.role === "co-organizer"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {m.role === "owner" ? (
                    <>
                      <CrownIcon /> Owner
                    </>
                  ) : m.role === "co-organizer" ? (
                    <>
                      <CoOrganizerIcon /> Co-organizador
                    </>
                  ) : (
                    <>
                      <PlaneIcon />
                      Viajero
                    </>
                  )}
                </span>

                {/* Kebab menu para cambiar rol (solo owner, solo no-owners) */}
                {isOwner && m.role !== "owner" && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setRoleMenuOpenFor(
                          roleMenuOpenFor === m.id ? null : m.id,
                        )
                      }
                      className="text-gray-500 hover:text-white px-1 transition text-lg leading-none"
                    >
                      ⋮
                    </button>
                    {roleMenuOpenFor === m.id && (
                      <div className="absolute right-0 top-6 z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-max">
                        <button
                          onClick={() =>
                            handleChangeRole(
                              m.id,
                              m.role === "co-organizer"
                                ? "traveler"
                                : "co-organizer",
                            )
                          }
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition"
                        >
                          {m.role === "co-organizer"
                            ? "Cambiar a viajero"
                            : "Hacer co-organizador"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Owner puede remover a otros */}
                {isOwner && m.user_id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(m.id, m.user_id)}
                    className="text-gray-600 hover:text-red-400 transition text-sm"
                  >
                    ✕
                  </button>
                )}

                {/* Cualquier miembro puede salirse (excepto owner) */}
                {m.user_id === currentUserId && !isOwner && (
                  <button
                    onClick={handleLeaveTrip}
                    className="text-gray-600 hover:text-red-400 text-xs transition"
                  >
                    Salir
                  </button>
                )}
              </div>
            </div>

            {m.member_preferences && (
              <div className="space-y-3 border-t border-gray-800 pt-3">
                {m.user_id === currentUserId && (
                  <div className=" flex flex-col items-end">
                    <button
                      onClick={() => setEditingPrefs(true)}
                      className="text-gray-500  flex gap-2 hover:text-blue-400 w-fit text-xs transition"
                    >
                      Editar
                      <EditIcon />
                    </button>
                  </div>
                )}
                {m.member_preferences.food_preferences?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Comida</p>
                    <div className="flex flex-wrap gap-1">
                      {m.member_preferences.food_preferences.map((f) => (
                        <span
                          key={f}
                          className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {m.member_preferences.activity_preferences?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Actividades</p>
                    <div className="flex flex-wrap gap-1">
                      {m.member_preferences.activity_preferences.map((a) => (
                        <span
                          key={a}
                          className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {m.member_preferences.attractions_preferences?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">
                      Lugares de interés
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.member_preferences.attractions_preferences.map((a) => (
                        <span
                          key={a}
                          className="bg-gray-800 text-gray-300 text-xs px-2 flex gap-1 items-center py-1 rounded-full"
                        >
                          <PinIcon /> {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <PreferencesModal
        isOpen={editingPrefs}
        onClose={() => setEditingPrefs(false)}
        tripId={trip.id}
        userId={currentUserId!}
        userCurrency={userCurrency}
        currentPreferences={
          members.find((m) => m.user_id === currentUserId)
            ?.member_preferences ?? null
        }
        onSaved={(updated) => {
          onMembersChange(
            members.map((m) =>
              m.user_id === currentUserId
                ? { ...m, member_preferences: updated }
                : m,
            ),
          );
          setEditingPrefs(false);
          showToast("Preferencias actualizadas ✓");
        }}
      />
    </section>
  );
}
