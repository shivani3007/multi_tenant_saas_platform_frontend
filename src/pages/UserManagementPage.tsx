import { useEffect, useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  clearUsersError,
  fetchUsers,
  inviteUser,
  removeUser,
  selectUsersState,
  setUserSearch,
  setUsersPage,
} from '../features/users/usersSlice';
import { pushToast } from '../features/ui/uiSlice';
import { useAuth } from '../auth/useAuth';
import { assignableRoles, ROLE_DESCRIPTION, ROLE_LABEL } from '../auth/roles';
import type { Role } from '../api/types';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { initialsOf } from '../utils/format';
import { Banner } from '../components/feedback/Banner';
import { EmptyState } from '../components/feedback/EmptyState';
import { Pagination } from '../components/files/Pagination';
import { IconMail, IconSearch, IconSpinner, IconUsers } from '../components/icons';

export function UserManagementPage() {
  const dispatch = useAppDispatch();
  const { user: currentUser, role } = useAuth();
  const { items, page, pageSize, total, totalPages, search, loading, error } = useAppSelector(selectUsersState);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Editor');
  const [inviting, setInviting] = useState(false);

  /*
   * You may only hand out a role at or below your own, so an Admin sees
   * Viewer/Editor/Admin and an Owner sees all four. This is the one place the
   * role *hierarchy* still applies — feature access itself comes from the
   * capability table, not from rank.
   */
  const grantable = assignableRoles(role);

  useEffect(() => {
    if (debouncedSearch !== search) dispatch(setUserSearch(debouncedSearch));
  }, [debouncedSearch, search, dispatch]);

  useEffect(() => {
    const promise = dispatch(fetchUsers());
    return () => promise.abort();
  }, [dispatch, page, pageSize, search]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true);
    try {
      // Basic client-side validation: require first and last name
      if (inviteFirstName.trim() === '' || inviteLastName.trim() === '') {
        dispatch(pushToast('Please enter both first and last name.', 'error'));
        setInviting(false);
        return;
      }
      const invited = await dispatch(
        inviteUser({
          email: inviteEmail.trim(),
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim(),
          role: inviteRole,
        }),
      ).unwrap();
      await dispatch(fetchUsers()).unwrap();
      dispatch(pushToast(`Invite sent to ${invited.email}.`, 'success'));
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('Editor');
      setInviteOpen(false);
    } catch (message) {
      dispatch(pushToast(typeof message === 'string' ? message : 'Could not send the invite.', 'error'));
    } finally {
      setInviting(false);
    }
  }

  function handleRemove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from this workspace?`)) return;
    void dispatch(removeUser(id))
      .unwrap()
      .then(() => dispatch(pushToast(`${name} removed.`, 'success')))
      .catch((message: string) => dispatch(pushToast(message, 'error')));
  }
  void handleRemove;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">Manage who has access to this workspace and what they can do.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setInviteOpen((open) => !open)}>
          <IconMail size={16} />
          Invite user
        </button>
      </div>

      {error && <Banner tone="error" onDismiss={() => dispatch(clearUsersError())}>{error}</Banner>}

      {inviteOpen && (
        <form className="card settings-section" onSubmit={handleInvite}>
          <h3 className="section-title">Invite someone</h3>
          <div className="toolbar" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '1 1 220px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="field-label" htmlFor="invite-first-name">
                  First name
                </label>
                <input
                  id="invite-first-name"
                  className="input"
                  value={inviteFirstName}
                  onChange={(event) => setInviteFirstName(event.target.value)}
                  placeholder="Ada"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="invite-last-name">
                  Last name
                </label>
                <input
                  id="invite-last-name"
                  className="input"
                  value={inviteLastName}
                  onChange={(event) => setInviteLastName(event.target.value)}
                  placeholder="Lovelace"
                  required
                />
              </div>
            </div>
            <div className="field" style={{ flex: '1 1 240px' }}>
              <label className="field-label" htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                className="input"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="ada@company.com"
                required
              />
            </div>
            <div className="field" style={{ flex: '0 1 160px' }}>
              <label className="field-label" htmlFor="invite-role">
                Role
              </label>
              <select
                id="invite-role"
                className="select"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as Role)}
              >
                {grantable.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {ROLE_LABEL[candidate]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting && <IconSpinner size={15} />}
              Send invite
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
          </div>
          <p className="field-hint">{ROLE_DESCRIPTION[inviteRole]}</p>
        </form>
      )}

      <div className="toolbar">
        <div className="search-field">
          <span className="search-icon">
            <IconSearch size={16} />
          </span>
          <input
            className="input"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
          />
        </div>
      </div>

      <div className="file-panel">
        <div className="card" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', overflow: 'hidden' }}>
          {loading === 'loading' ? (
            <div style={{ padding: 14, display: 'grid', gap: 8 }}>
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="skeleton" style={{ height: 44 }} aria-hidden="true" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<IconUsers size={26} />}
              title="No users found"
              description={search ? 'Try a different search term.' : 'Invite your first teammate to get started.'}
            />
          ) : (
            <div style={{ overflowX: 'auto' }} className={loading === 'refreshing' ? 'stale' : undefined}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Status</th>
                    <th scope="col">Role</th>
                    <th scope="col" style={{ width: 48 }}>
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((member) => {
                    const isSelf = member.id === currentUser?.id;

                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <span className="avatar" aria-hidden="true">
                              {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initialsOf(member.firstName ?? '')}
                            </span>
                            <span style={{ display: 'grid', lineHeight: 1.3, minWidth: 0 }}>
                              <span style={{ fontWeight: 560 }}>
                                {member.firstName ?? member.firstName}
                                {isSelf && <span className="muted"> (you)</span>}
                              </span>
                              <span className="file-sub">{member.email}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-role">{member.status}</span>
                        </td>
                        <td>
                          <span className="badge badge-role">{ROLE_LABEL[member.role]}</span>
                        </td>
                        {/* <td>
                            <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                              onClick={() => handleRemove(member.id, member.firstName ?? '')}
                            disabled={locked || busy}
                              aria-label={`Remove ${member.firstName ?? member.firstName}`}
                              title={isSelf ? 'You cannot remove yourself' : 'Remove'}
                          >
                            <IconTrash size={15} />
                          </button>
                        </td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          disabled={loading === 'loading'}
          onPageChange={(next) => dispatch(setUsersPage(next))}
        />
      </div>
    </div>
  );
}
