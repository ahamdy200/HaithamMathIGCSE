import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  Download,
  Upload,
  MessageCircle,
  X,
  Users,
  KeyRound,
} from 'lucide-react';
import type { DirectorySeatUser } from '../../types';
import {
  upsertDirectoryUsers,
  updateDirectoryUser,
  deleteDirectoryUser,
} from '../../utils/accountsApi';

interface ParentManagementViewProps {
  users: DirectorySeatUser[];
  onRefresh: () => Promise<void>;
  onNotice: (msg: string) => void;
}

function normalizeWhatsAppDigits(rawPhone?: string): string {
  const digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) return `20${digits.slice(1)}`;
  return digits;
}

function downloadCsvFile(filename: string, headers: string[], rows: string[][]): void {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ParentManagementView: React.FC<ParentManagementViewProps> = ({
  users,
  onRefresh,
  onNotice,
}) => {
  const parents = useMemo(() => users.filter((u) => u.role === 'parent'), [users]);
  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<DirectorySeatUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedIds, setLinkedIds] = useState<number[]>([]);

  // Import CSV modal
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  const filteredParents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => {
      const childNames = getLinkedStudentsForParent(p)
        .map((c) => c.fullName.toLowerCase())
        .join(' ');
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        childNames.includes(q)
      );
    });
  }, [parents, query, students]);

  function getLinkedStudentsForParent(p: DirectorySeatUser): DirectorySeatUser[] {
    const ids = new Set<number>([
      ...(Array.isArray(p.linkedStudentIds) ? p.linkedStudentIds : []),
      ...(p.linkedStudentId ? [p.linkedStudentId] : []),
    ]);
    return students.filter((s) => ids.has(s.id));
  }

  const openCreateModal = () => {
    setEditingParent(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');
    setLinkedIds([]);
    setModalOpen(true);
  };

  const openEditModal = (p: DirectorySeatUser) => {
    setEditingParent(p);
    setFullName(p.fullName);
    setUsername(p.username);
    setPassword(p.password);
    setEmail(p.email || p.parentEmail || '');
    setPhone(p.phone || '');
    const ids = Array.from(
      new Set([
        ...(Array.isArray(p.linkedStudentIds) ? p.linkedStudentIds : []),
        ...(p.linkedStudentId ? [p.linkedStudentId] : []),
      ])
    );
    setLinkedIds(ids);
    setModalOpen(true);
  };

  const toggleLinkedChild = (studentId: number) => {
    setLinkedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) return;
    setSaving(true);
    try {
      const linkedStudents = students.filter((s) => linkedIds.includes(s.id));
      const payload: Partial<DirectorySeatUser> = {
        role: 'parent',
        domain: 'Mr.HaithamHusseinig',
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim(),
        email: email.trim() || undefined,
        parentEmail: email.trim() || undefined,
        phone: phone.trim() || undefined,
        linkedStudentIds: linkedIds,
        linkedStudentId: linkedIds[0] || undefined,
        linkedStudentName: linkedStudents.map((s) => s.fullName).join(', ') || undefined,
      };
      const res = editingParent
        ? await updateDirectoryUser(editingParent.id, payload)
        : await upsertDirectoryUsers([payload]);
      if (res.success) {
        onNotice(
          editingParent
            ? `Updated parent account "${fullName.trim()}".`
            : `Created parent account "${fullName.trim()}".`
        );
        setModalOpen(false);
        await onRefresh();
      } else {
        onNotice(res.error || 'Could not save parent account.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParent = async (p: DirectorySeatUser) => {
    if (!window.confirm(`Remove parent account "${p.fullName}" (${p.username})? Student records remain untouched.`)) {
      return;
    }
    const res = await deleteDirectoryUser(p.id);
    if (res.success) {
      onNotice(`Removed parent account "${p.fullName}".`);
      await onRefresh();
    }
  };

  const handleExportParents = () => {
    const headers = ['Full Name', 'Username', 'Password', 'Email', 'Phone', 'Linked Children'];
    const rows = parents.map((p) => [
      p.fullName,
      p.username,
      p.password,
      p.email || p.parentEmail || '',
      p.phone || '',
      getLinkedStudentsForParent(p)
        .map((c) => `${c.fullName} (${c.username})`)
        .join(' | '),
    ]);
    downloadCsvFile('MrHaitham_Parent_Accounts.csv', headers, rows);
    onNotice(`Exported ${parents.length} parent account(s) for Excel.`);
  };

  const handleImportParents = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const batch: Partial<DirectorySeatUser>[] = [];
    for (const line of lines) {
      const [u, pass, name, mail, ph, childUsernames] = line.split(',').map((v) => (v || '').trim());
      if (!u || !pass || u.toLowerCase() === 'username') continue;
      const matchedChildren = childUsernames
        ? childUsernames
            .split(/[;|]/)
            .map((c) => c.trim().toLowerCase())
            .map((c) => students.find((s) => s.username.toLowerCase() === c || s.fullName.toLowerCase() === c))
            .filter((s): s is DirectorySeatUser => Boolean(s))
        : [];
      batch.push({
        role: 'parent',
        domain: 'Mr.HaithamHusseinig',
        username: u,
        password: pass,
        fullName: name || u,
        email: mail || undefined,
        parentEmail: mail || undefined,
        phone: ph || undefined,
        linkedStudentIds: matchedChildren.map((c) => c.id),
        linkedStudentId: matchedChildren[0]?.id,
        linkedStudentName: matchedChildren.map((c) => c.fullName).join(', ') || undefined,
      });
    }
    if (batch.length === 0) return;
    const res = await upsertDirectoryUsers(batch);
    if (res.success) {
      setImportOpen(false);
      setCsvText('');
      onNotice(`Imported ${res.addedCount || batch.length} parent account(s).`);
      await onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parents by name, username, email, phone, or child..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5] focus:bg-white text-xs outline-none focus:border-[#1B365D]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F6F2] text-[#13294B] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button
            type="button"
            onClick={handleExportParents}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F7F6F2] text-[#13294B] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Parent Account
          </button>
        </div>
      </div>

      {/* Parent Cards List */}
      {filteredParents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-[#1B365D]/40 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No parent accounts yet</p>
          <p className="text-xs text-slate-500">
            Create a parent account and link one or more enrolled children so families can access the Parent Portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredParents.map((p) => {
            const children = getLinkedStudentsForParent(p);
            const waDigits = normalizeWhatsAppDigits(p.phone);
            const waText = encodeURIComponent(
              `Hello ${p.fullName}, this is Mr. Haitham Hussien's IGCSE Mathematics team checking in regarding ${
                children.map((c) => c.fullName).join(' & ') || 'your child'
              }.`
            );
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#13294B] truncate">{p.fullName}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Username: <span className="font-mono text-slate-700">{p.username}</span>
                      {(p.email || p.parentEmail) && ` · ${p.email || p.parentEmail}`}
                    </p>
                    {p.phone && <p className="text-[11px] text-slate-500">Phone: {p.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {waDigits && (
                      <a
                        href={`https://wa.me/${waDigits}?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Message on WhatsApp"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      title="Edit Parent Account"
                      className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#1B365D] hover:bg-[#EEF3F9]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteParent(p)}
                      title="Remove Parent Account"
                      className="p-1.5 rounded-lg border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {children.length === 0 ? (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        No linked children
                      </span>
                    ) : (
                      children.map((c) => (
                        <span
                          key={c.id}
                          className="text-[11px] font-semibold bg-[#EEF3F9] text-[#1B365D] px-2.5 py-0.5 rounded-full border border-[#DCE5F0]"
                        >
                          {c.fullName} ({c.grade || 'IGCSE'})
                        </span>
                      ))
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> {p.password}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Parent Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="math-serif text-base font-bold text-[#13294B]">
                {editingParent ? `Edit Parent: ${editingParent.fullName}` : 'Add Parent Account'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveParent} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Parent Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 10..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Password *</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notification Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Link Children ({linkedIds.length} selected)
                </label>
                {students.length === 0 ? (
                  <p className="text-[11px] text-slate-400 bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E7EB]">
                    Add students in the Enrolled Roster tab first, then link them here.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-[#E5E7EB] rounded-xl divide-y divide-slate-100 bg-[#FAF9F5]">
                    {students.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-white cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={linkedIds.includes(s.id)}
                            onChange={() => toggleLinkedChild(s.id)}
                          />
                          <span className="font-semibold text-slate-800">{s.fullName}</span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {s.grade || 'IGCSE'} {s.section || ''}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Parent Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Parent CSV Modal */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setImportOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] max-w-lg w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="math-serif text-base font-bold text-[#13294B]">Import Parent Accounts (CSV)</h3>
              <button type="button" onClick={() => setImportOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleImportParents} className="space-y-3 text-xs">
              <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E7EB] text-[11px] text-slate-600">
                Format per line: <code>username,password,Parent Full Name,email,phone,child_username1|child_username2</code>
              </div>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="parent_sara,pass2025,Mrs. Hana Ali,hana@example.com,+201012345678,sara_y10"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] font-mono text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1B365D] hover:bg-[#13294B] text-white font-bold"
                >
                  Import Parents
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
