import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { user, signOut } = useAuth(), navigate = useNavigate();
  const links = [
    ['/dashboard', 'Overview', '⌂'],
    ['/resume', 'Resume Intel', '▤'],
    ['/practice', 'Interview Prep', '✦'],
    ['/learning', 'Learning', '▱'],
    ['/history', 'History', '◷'],
  ];
  return <div className="app"><aside><div className="logo"><b>h</b><span>hireai</span></div><p className="sidebar-caption">AI INTERVIEW COMMAND CENTER</p><div className="sidebar-section-label">NAVIGATION</div><nav>{links.map(([to, label, icon]) => <NavLink key={to} to={to}><span className="nav-icon" aria-hidden="true">{icon}</span>{label}<i>↗</i></NavLink>)}</nav><div className="sidebar-section-label workspace-label">WORKSPACE</div><div className="workspace-links"><NavLink to="/resume"><span>◌</span>Current resume</NavLink><NavLink to="/practice"><span>◈</span>Question engine</NavLink><NavLink to="/history"><span>◍</span>Performance</NavLink></div><div className="sidebar-bottom"><NavLink to="/credits"><span className="nav-icon">＋</span>Credits <small>{user?.credits || 0}</small></NavLink><NavLink to="/settings"><span className="nav-icon">⚙</span>Settings</NavLink><div className="profile"><div className="avatar">{user?.name?.[0] || '?'}</div><div><strong>{user?.name}</strong><small>{user?.email}</small></div><span className="profile-status" /></div><button className="signout" onClick={async () => { await signOut(); navigate('/'); }}>Sign out <span>↗</span></button></div></aside><main>{children}</main></div>;
}
