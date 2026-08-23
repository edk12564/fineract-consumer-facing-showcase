import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navGroups } from '../lib/content';
import { ChevronIcon } from './Icons';

const groups = navGroups.map((group) => ({
  id: group.id,
  title: group.title,
  links: group.links.map((link) => ({
    to:
      link.source === 'readme'
        ? '/docs/readme'
        : `/docs/${link.source}/${link.slug}`,
    label: link.title,
  })),
}));

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav className="sidebar-nav" aria-label="Documentation">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.id] === true;
        return (
          <div className="sidebar-group" key={group.id}>
            <button
              type="button"
              className="sidebar-group-toggle"
              aria-expanded={!isCollapsed}
              onClick={() =>
                setCollapsed((c) => ({ ...c, [group.id]: !isCollapsed }))
              }
            >
              <span>{group.title}</span>
              <ChevronIcon
                size={14}
                className={isCollapsed ? 'chevron collapsed' : 'chevron'}
              />
            </button>
            {!isCollapsed && (
              <ul className="sidebar-list">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        isActive ? 'sidebar-link active' : 'sidebar-link'
                      }
                      onClick={onNavigate}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
