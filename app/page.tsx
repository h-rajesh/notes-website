"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Note = { id: number; title: string; content: string; createdAt: string };

// ── Helpers ───────────────────────────────────────────────────────────────────
const relativeTime = (iso: string) => {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// ── Icons (inline SVG, no dep) ────────────────────────────────────────────────
const Icon = {
  Plus:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>,
  Trash:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Edit:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  Close:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Note:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>,
  Back:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Check:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#1a1208]/50 backdrop-blur-sm" onClick={onCancel}>
    <div
      className="w-full max-w-sm bg-[#faf6ef] border border-[#e8dfd0] rounded-2xl p-6 shadow-2xl shadow-[#1a1208]/20"
      style={{ animation: "popIn .2s cubic-bezier(.34,1.5,.64,1) both" }}
      onClick={e => e.stopPropagation()}
    >
      <p className="font-display text-lg font-bold text-[#1a1208] mb-1">Delete this note?</p>
      <p className="text-sm text-[#8a7a65] font-body mb-6">This can&apos;t be undone.</p>
      <div className="flex gap-2">
        <button onClick={onCancel}  className="flex-1 py-2.5 rounded-xl border border-[#ddd4c4] text-[#8a7a65] font-mono text-[11px] tracking-wider uppercase hover:border-[#c8b89a] transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-[#c0392b] text-white font-mono text-[11px] tracking-wider uppercase hover:bg-[#a93226] transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── Sidebar Note Row ──────────────────────────────────────────────────────────
const NoteRow = ({
  note, active, onClick,
}: { note: Note; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150 group relative
      ${active
        ? "bg-[#1a1208] text-[#faf6ef]"
        : "hover:bg-[#f0e8db] text-[#1a1208]"
      }`}
  >
    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#e07b39] rounded-r-full" />}
    <p className={`font-display text-sm font-bold truncate leading-snug mb-0.5 ${active ? "text-[#faf6ef]" : "text-[#1a1208]"}`}>
      {note.title || "Untitled"}
    </p>
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-[10px] tracking-wide ${active ? "text-[#c8b89a]" : "text-[#a8957c]"}`}>
        {relativeTime(note.createdAt)}
      </span>
      <span className={`text-[10px] ${active ? "text-[#706050]" : "text-[#ccc0ae]"}`}>·</span>
      <span className={`font-body text-[10px] truncate ${active ? "text-[#9a8a72]" : "text-[#b8a88e]"}`}>
        {note.content.slice(0, 38) || "No content"}
      </span>
    </div>
  </button>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes]           = useState<Note[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeId, setActiveId]     = useState<number | null>(null);
  const [editing, setEditing]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [search, setSearch]         = useState("");
  const [toast, setToast]           = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<number | null>(null);
  const [draft, setDraft]           = useState({ title: "", content: "" });
  const [saving, setSaving]         = useState(false);
  const [mobileSide, setMobileSide] = useState(true); // mobile: show sidebar or detail

  const titleRef   = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      
      if (!res.ok) {
        throw new Error("Failed to fetch notes from server");
      }
      
      const data: Note[] = await res.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid format received from server");
      }
      
      setNotes(data);
      if (!activeId && data.length) setActiveId(data[0].id);
    } catch (error) { 
      showToast("Couldn't load notes."); 
    } finally { 
      setLoading(false); 
    }
  }, [activeId]);

  useEffect(() => { fetchNotes(); }, []);

  const activeNote = notes.find(n => n.id === activeId) ?? null;

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  // ── Open create mode ──
  const openCreate = () => {
    setCreating(true);
    setEditing(false);
    setDraft({ title: "", content: "" });
    setMobileSide(false);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  // ── Open edit mode ──
  const openEdit = () => {
    if (!activeNote) return;
    setEditing(true);
    setCreating(false);
    setDraft({ title: activeNote.title, content: activeNote.content });
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  // ── Cancel ──
  const cancelEdit = () => {
    setEditing(false);
    setCreating(false);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    setSaving(true);
    try {
      if (creating) {
        const res = await fetch("/api/notes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (res.ok) {
          const created: Note = await res.json();
          await fetchNotes();
          setActiveId(created.id);
          setCreating(false);
          showToast("Note created");
        }
      } else if (editing && activeNote) {
        const res = await fetch(`/api/notes/${activeNote.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (res.ok) {
          await fetchNotes();
          setEditing(false);
          showToast("Changes saved");
        }
      }
    } finally { setSaving(false); }
  };

  // ── Delete ──
  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      setActiveId(remaining[0]?.id ?? null);
      if (editing || creating) { setEditing(false); setCreating(false); }
      setConfirmId(null);
      showToast("Note deleted");
    }
  };

  const selectNote = (id: number) => {
    setActiveId(id);
    setEditing(false);
    setCreating(false);
    setMobileSide(false);
  };

  const isWriting = editing || creating;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Figtree:wght@300;400;500;600;700;800&family=Martian+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        .font-display { font-family: 'Figtree', sans-serif; }
        .font-serif   { font-family: 'Instrument Serif', serif; }
        .font-body    { font-family: 'Figtree', sans-serif; }
        .font-mono    { font-family: 'Martian Mono', monospace; }

        @keyframes popIn {
          from { opacity: 0; transform: scale(.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
        }
        .anim-pop     { animation: popIn      .25s cubic-bezier(.34,1.4,.64,1) both; }
        .anim-right   { animation: slideRight .22s ease both; }
        .anim-up      { animation: fadeUp     .2s  ease both; }
        .anim-toast   { animation: toastIn    .25s cubic-bezier(.34,1.4,.64,1) both; }

        textarea { field-sizing: content; min-height: 240px; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #d4c4ae; border-radius: 99px; }
      `}</style>

      {/* ── Root shell ── */}
      <div className="h-screen flex bg-[#faf6ef] font-body overflow-hidden select-none">

        {/* ════════════════════════════════
            LEFT SIDEBAR
        ════════════════════════════════ */}
        <aside
          className={`
            flex flex-col w-full sm:w-72 lg:w-80 shrink-0 border-r border-[#e4d9c8]
            bg-[#f5efe4] h-full overflow-hidden
            ${mobileSide ? "flex" : "hidden sm:flex"}
          `}
        >
          {/* Sidebar header */}
          <div className="px-5 pt-6 pb-4 border-b border-[#e4d9c8]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1a1208] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#e8d5b0" strokeWidth={1.8} strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="8" y1="13" x2="16" y2="13"/>
                    <line x1="8" y1="17" x2="12" y2="17"/>
                  </svg>
                </div>
                <span className="font-display text-[13px] font-bold text-[#1a1208] tracking-tight">Inkpad</span>
              </div>

              <button
                onClick={openCreate}
                className="w-8 h-8 rounded-lg bg-[#e07b39] hover:bg-[#c96a2a] text-white flex items-center justify-center transition-colors shadow-sm shadow-[#e07b39]/30"
                title="New note"
              >
                <Icon.Plus />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b8a88e]"><Icon.Search /></span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="w-full bg-[#ede5d8] border border-[#ddd0bc] rounded-xl pl-8.5 pr-3 py-2 text-xs text-[#1a1208] placeholder:text-[#b8a88e] outline-none focus:border-[#c8a87a] transition-colors font-body"
                style={{ paddingLeft: "2rem" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b8a88e] hover:text-[#1a1208] transition-colors"><Icon.Close /></button>
              )}
            </div>
          </div>

          {/* Note count label */}
          <div className="px-5 pt-3 pb-1">
            <span className="font-mono text-[9px] tracking-[0.18em] text-[#b8a88e] uppercase">
              {filtered.length} {filtered.length === 1 ? "note" : "notes"}
            </span>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#ddd0bc] border-t-[#e07b39] rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <Icon.Note />
                <p className="text-sm font-display font-bold text-[#b8a88e]">
                  {search ? "Nothing found" : "No notes yet"}
                </p>
                {!search && (
                  <button onClick={openCreate} className="text-xs text-[#e07b39] hover:underline font-body mt-1">
                    Create your first
                  </button>
                )}
              </div>
            ) : (
              filtered.map((note, i) => (
                <div key={note.id} className="anim-right" style={{ animationDelay: `${i * 30}ms` }}>
                  <NoteRow
                    note={note}
                    active={note.id === activeId && !creating}
                    onClick={() => selectNote(note.id)}
                  />
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ════════════════════════════════
            RIGHT PANEL
        ════════════════════════════════ */}
        <main className={`flex-1 flex flex-col h-full overflow-hidden ${mobileSide ? "hidden sm:flex" : "flex"}`}>

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-[#e4d9c8] bg-[#faf6ef] shrink-0">
            {/* Mobile back */}
            <button
              onClick={() => setMobileSide(true)}
              className="sm:hidden mr-3 text-[#8a7a65] hover:text-[#1a1208] transition-colors"
            >
              <Icon.Back />
            </button>

            <div className="flex-1 min-w-0">
              {(activeNote || creating) ? (
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#b8a88e] uppercase truncate">
                  {creating
                    ? "New note"
                    : fullDate(activeNote!.createdAt)}
                </p>
              ) : (
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#c8b89a] uppercase">
                  Select a note
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 ml-4">
              {isWriting ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-3.5 py-1.5 rounded-lg border border-[#ddd0bc] text-[#8a7a65] font-mono text-[10px] tracking-wider uppercase hover:border-[#c8a87a] hover:text-[#1a1208] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !draft.title.trim() || !draft.content.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1a1208] hover:bg-[#2d1f0e] disabled:opacity-40 text-[#faf6ef] font-mono text-[10px] tracking-wider uppercase transition-all shadow-sm"
                  >
                    {saving ? (
                      <div className="w-3 h-3 border border-[#c8b89a] border-t-transparent rounded-full animate-spin" />
                    ) : <Icon.Check />}
                    {saving ? "Saving" : "Save"}
                  </button>
                </>
              ) : activeNote ? (
                <>
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#ddd0bc] text-[#6a5a45] font-mono text-[10px] tracking-wider uppercase hover:border-[#1a1208] hover:text-[#1a1208] transition-all"
                  >
                    <Icon.Edit /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmId(activeNote.id)}
                    className="p-1.5 rounded-lg border border-[#ddd0bc] text-[#b8a88e] hover:border-[#c0392b] hover:text-[#c0392b] transition-all"
                  >
                    <Icon.Trash />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* ── Content area ── */}
          <div className="flex-1 overflow-y-auto">
            {/* WRITING MODE */}
            {isWriting ? (
              <div className="max-w-2xl mx-auto px-6 sm:px-10 pt-10 pb-20 anim-up">
                <input
                  ref={titleRef}
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="Note title"
                  className="w-full bg-transparent outline-none font-serif text-[2.2rem] leading-tight text-[#1a1208] placeholder:text-[#ccc0ae] border-b-2 border-[#e4d9c8] focus:border-[#e07b39] pb-3 mb-8 transition-colors"
                />
                <textarea
                  ref={contentRef}
                  value={draft.content}
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  placeholder="Start writing…"
                  className="w-full bg-transparent outline-none font-body text-[15px] text-[#3a2e22] placeholder:text-[#ccc0ae] leading-[1.85] resize-none border-none"
                />
              </div>
            ) : activeNote ? (
              /* READ MODE */
              <div key={activeNote.id} className="max-w-2xl mx-auto px-6 sm:px-10 pt-10 pb-24 anim-up">
                <h1 className="font-serif text-[2.4rem] leading-tight text-[#1a1208] mb-4 tracking-tight">
                  {activeNote.title}
                </h1>

                {/* Meta strip */}
                <div className="flex items-center gap-3 mb-10">
                  <span className="font-mono text-[10px] tracking-widest text-[#b8a88e] uppercase">
                    {fullDate(activeNote.createdAt)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#d4c4ae]" />
                  <span className="font-mono text-[10px] tracking-widest text-[#b8a88e] uppercase">
                    {wordCount(activeNote.content)} words
                  </span>
                </div>

                {/* Ruled lines behind text — purely decorative */}
                <div className="relative">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #ede5d840 27px, #ede5d840 28px)",
                      backgroundPositionY: "1.85rem",
                    }}
                  />
                  <p className="relative font-body text-[15px] text-[#3a2e22] leading-[1.85] whitespace-pre-wrap">
                    {activeNote.content}
                  </p>
                </div>
              </div>
            ) : (
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6 pb-12">
                <div className="w-16 h-16 rounded-2xl bg-[#f0e8db] border border-[#e4d9c8] flex items-center justify-center text-[#c8b89a]">
                  <Icon.Note />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-[#3a2e22] mb-1.5">Nothing selected</p>
                  <p className="font-body text-sm text-[#a8957c]">Pick a note from the sidebar or create one</p>
                </div>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1208] text-[#faf6ef] font-mono text-[11px] tracking-widest uppercase hover:bg-[#2d1f0e] transition-colors shadow-sm"
                >
                  <Icon.Plus /> New note
                </button>
              </div>
            )}
          </div>

          {/* ── Word count footer (write mode) ── */}
          {isWriting && (
            <div className="shrink-0 px-6 sm:px-10 py-2.5 border-t border-[#e4d9c8] bg-[#faf6ef] flex items-center gap-3">
              <span className="font-mono text-[10px] tracking-widest text-[#c8b89a] uppercase">
                {wordCount(draft.content)} words
              </span>
              <span className="w-1 h-1 rounded-full bg-[#ddd0bc]" />
              <span className="font-mono text-[10px] tracking-widest text-[#c8b89a] uppercase">
                {draft.content.length} chars
              </span>
            </div>
          )}
        </main>
      </div>

      {/* ── Confirm delete ── */}
      {confirmId && (
        <ConfirmDialog
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] flex items-center gap-2 bg-[#1a1208] text-[#e8d5b0] font-mono text-[10px] tracking-widest uppercase px-5 py-3 rounded-full shadow-xl anim-toast whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e07b39]" />
          {toast}
        </div>
      )}
    </>
  );
}