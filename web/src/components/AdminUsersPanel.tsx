'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  academicDepartmentOptions,
  AcademicDepartment,
  formatSupportArea,
  SupportArea,
  supportAreaOptions,
} from '@/lib/routing';

type AdminUser = {
  id: string;
  schoolId: string;
  email: string | null;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  active: boolean;
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
  assignmentStatus: 'ASSIGNED' | 'UNASSIGNED' | 'GLOBAL';
  needsAssignment: boolean;
  profile: { fullName: string } | null;
};

type DraftRouting = {
  supportArea: SupportArea | null;
  academicDepartment: AcademicDepartment | null;
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRouting>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await apiRequest<AdminUser[]>('/admin/users');
      setUsers(userList);
      setDrafts(
        Object.fromEntries(
          userList.map((user) => [
            user.id,
            {
              supportArea: user.supportArea,
              academicDepartment: user.academicDepartment,
            },
          ]),
        ),
      );
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const saveRouting = async (user: AdminUser) => {
    const draft = drafts[user.id];
    if (!draft) {
      return;
    }

    try {
      setSavingId(user.id);
      setError(null);
      await apiRequest(`/admin/users/${user.id}/routing`, {
        method: 'PATCH',
        body: JSON.stringify({
          supportArea: user.role === 'STAFF' ? draft.supportArea : null,
          academicDepartment:
            user.role === 'ADMIN' ? null : draft.academicDepartment,
        }),
      });
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save routing');
    } finally {
      setSavingId(null);
    }
  };

  const unassignedCount = users.filter((user) => user.needsAssignment).length;

  return (
    <section className="card stack admin-user-panel">
      <div className="panel-header">
        <div className="stack" style={{ gap: 4 }}>
          <p className="eyebrow">User Routing</p>
          <h3>Assign academic departments</h3>
          <p className="small">
            Legacy users stay active, but students and staff need routing before the ticket workflow is available.
          </p>
        </div>
        <div className="row wrap-actions">
          <span className={`badge ${unassignedCount > 0 ? 'warn' : 'success'}`}>
            {unassignedCount} need assignment
          </span>
          <button className="secondary" type="button" onClick={() => void loadUsers()}>
            Refresh Users
          </button>
        </div>
      </div>

      {error ? <p style={{ color: 'var(--warn)', margin: 0 }}>{error}</p> : null}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>School ID</th>
                <th>Role</th>
                <th>Support Area</th>
                <th>Academic Department</th>
                <th>Status</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = drafts[user.id] ?? {
                  supportArea: user.supportArea,
                  academicDepartment: user.academicDepartment,
                };

                return (
                  <tr key={user.id}>
                    <td>{user.profile?.fullName ?? user.schoolId}</td>
                    <td className="code">{user.schoolId}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.role === 'STAFF' ? (
                        <select
                          value={draft.supportArea ?? ''}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...draft,
                                supportArea: (event.target.value || null) as SupportArea | null,
                              },
                            }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {supportAreaOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="small">
                          {user.role === 'ADMIN'
                            ? 'Global admin'
                            : formatSupportArea(user.supportArea)}
                        </span>
                      )}
                    </td>
                    <td>
                      {user.role === 'ADMIN' ? (
                        <span className="small">Global admin</span>
                      ) : (
                        <select
                          value={draft.academicDepartment ?? ''}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...draft,
                                academicDepartment: (event.target.value || null) as AcademicDepartment | null,
                              },
                            }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {academicDepartmentOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${user.needsAssignment ? 'warn' : user.role === 'ADMIN' ? '' : 'success'}`}>
                        {user.assignmentStatus}
                      </span>
                    </td>
                    <td>
                      {user.role === 'ADMIN' ? (
                        <span className="small">No action needed</span>
                      ) : (
                        <button
                          type="button"
                          disabled={savingId === user.id}
                          onClick={() => void saveRouting(user)}
                        >
                          {savingId === user.id ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
