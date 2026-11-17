import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { Application, ApplicationStatus } from '../types/index.ts';

interface ApplicationTrackerViewProps {
  initialStatusFilter?: ApplicationStatus | 'All';
  openNewModalSignal: number;
  onDataChanged: () => void;
}

const STATUSES: ApplicationStatus[] = ['Applied', 'Interview', 'Selected', 'Rejected'];

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  Applied: 'bg-sky-50 text-sky-800 border-sky-200',
  Interview: 'bg-amber-50 text-amber-800 border-amber-200',
  Selected: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-50 text-red-800 border-red-200',
};

interface FormState {
  company: string;
  role: string;
  location: string;
  salaryRange: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedDate: string;
  notes: string;
}

function emptyFormState(): FormState {
  return {
    company: '',
    role: '',
    location: 'Remote',
    salaryRange: '',
    jobUrl: '',
    status: 'Applied',
    appliedDate: new Date().toISOString().slice(0, 10),
    notes: '',
  };
}

export function ApplicationTrackerView({
  initialStatusFilter = 'All',
  openNewModalSignal,
  onDataChanged,
}: ApplicationTrackerViewProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState>(emptyFormState);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    if (openNewModalSignal > 0) {
      openCreateModal();
    }
  }, [openNewModalSignal]);

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const { applications: list } = await api.getApplications();
      setApplications(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  function openCreateModal() {
    setEditingApp(null);
    setForm(emptyFormState());
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(app: Application) {
    setEditingApp(app);
    setForm({
      company: app.company,
      role: app.role,
      location: app.location || '',
      salaryRange: app.salaryRange || '',
      jobUrl: app.jobUrl || '',
      status: app.status,
      appliedDate: app.appliedDate
        ? new Date(app.appliedDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: app.notes || '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.company.trim() || !form.role.trim()) {
      setFormError('Company name and job role are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingApp) {
        const { application: updated } = await api.updateApplication(editingApp.id, {
          company: form.company.trim(),
          role: form.role.trim(),
          location: form.location.trim(),
          salaryRange: form.salaryRange.trim(),
          jobUrl: form.jobUrl.trim(),
          status: form.status,
          appliedDate: form.appliedDate,
          notes: form.notes.trim(),
        });
        setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const { application: created } = await api.createApplication({
          company: form.company.trim(),
          role: form.role.trim(),
          location: form.location.trim() || 'Remote',
          salaryRange: form.salaryRange.trim(),
          jobUrl: form.jobUrl.trim(),
          status: form.status,
          appliedDate: form.appliedDate,
          notes: form.notes.trim(),
        });
        setApplications((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      onDataChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save application.');
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineStatusChange(app: Application, newStatus: ApplicationStatus) {
    const previousStatus = app.status;
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
    );
    try {
      const { application: updated } = await api.updateApplication(app.id, { status: newStatus });
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      onDataChanged();
    } catch (err) {
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: previousStatus } : a))
      );
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteApplication(deleteTarget.id);
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredApps = applications.filter((app) => {
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      app.company.toLowerCase().includes(q) ||
      app.role.toLowerCase().includes(q) ||
      (app.location || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or role..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
            />
          </div>

          <div className="flex flex-wrap p-1 bg-slate-100 rounded-lg">
            {(['All', ...STATUSES] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3">
          <span className="text-xs text-slate-500 tabular-nums">
            Showing {filteredApps.length} of {applications.length}
          </span>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-[#0B1F3A] hover:bg-[#122B4D] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              {applications.length === 0
                ? 'No job applications tracked yet'
                : 'No matching applications'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-5 max-w-md mx-auto">
              {applications.length === 0
                ? 'Log your applications to track interviews, offers, and follow-up notes.'
                : 'Try adjusting your search keyword or status filter.'}
            </p>
            {applications.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#122B4D] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Application</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-3 px-5">Company & Role</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{app.company}</span>
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open job posting"
                              className="text-slate-400 hover:text-sky-600"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {app.role}
                          {app.salaryRange ? ` · ${app.salaryRange}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {app.location || 'Remote'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {new Date(app.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          aria-label={`Status for ${app.company} ${app.role}`}
                          value={app.status}
                          onChange={(e) =>
                            void handleInlineStatusChange(app, e.target.value as ApplicationStatus)
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                            STATUS_BADGE[app.status]
                          }`}
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-white text-slate-900">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {app.notes || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(app)}
                            aria-label={`Edit ${app.company}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(app)}
                            aria-label={`Delete ${app.company}`}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredApps.map((app) => (
                <div key={app.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">{app.company}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{app.role}</p>
                      <p className="text-xs text-slate-400 mt-1 tabular-nums">
                        {app.location || 'Remote'} ·{' '}
                        {new Date(app.appliedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <select
                      value={app.status}
                      onChange={(e) =>
                        void handleInlineStatusChange(app, e.target.value as ApplicationStatus)
                      }
                      className={`px-2 py-1 text-xs font-medium rounded-md border ${
                        STATUS_BADGE[app.status]
                      }`}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-white text-slate-900">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {app.notes && <p className="text-xs text-slate-600">{app.notes}</p>}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(app)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(app)}
                      className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Application Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                {editingApp ? 'Edit Application' : 'Add Job Application'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="app-company" className="block text-xs font-medium text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    id="app-company"
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Stripe"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
                <div>
                  <label htmlFor="app-role" className="block text-xs font-medium text-slate-700 mb-1">
                    Job Role
                  </label>
                  <input
                    id="app-role"
                    type="text"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Frontend Engineer"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="app-status" className="block text-xs font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    id="app-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ApplicationStatus })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="app-date" className="block text-xs font-medium text-slate-700 mb-1">
                    Applied Date
                  </label>
                  <input
                    id="app-date"
                    type="date"
                    value={form.appliedDate}
                    onChange={(e) => setForm({ ...form, appliedDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
                <div>
                  <label htmlFor="app-location" className="block text-xs font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    id="app-location"
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Remote"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="app-salary" className="block text-xs font-medium text-slate-700 mb-1">
                    Compensation <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="app-salary"
                    type="text"
                    value={form.salaryRange}
                    onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                    placeholder="$130k - $160k"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
                <div>
                  <label htmlFor="app-url" className="block text-xs font-medium text-slate-700 mb-1">
                    Job URL <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="app-url"
                    type="url"
                    value={form.jobUrl}
                    onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="app-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Notes & Interview Follow-ups
                </label>
                <textarea
                  id="app-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Recruiter contact, interview dates, referral details..."
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 resize-y"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#0B1F3A] hover:bg-[#122B4D] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : editingApp ? 'Save Changes' : 'Save Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Delete application?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Remove <span className="font-medium text-slate-900">{deleteTarget.company}</span> (
              {deleteTarget.role}) from your tracker? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
