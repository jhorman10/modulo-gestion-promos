import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const defaultNavItems: NavItem[] = [
  { to: '/promotions', label: 'Promociones', end: true },
  { to: '/promotions/new', label: 'Nueva Promoción' },
  { to: '/summary', label: 'Resumen' },
];

export interface NavigationProps {
  items?: NavItem[];
}

export function Navigation({ items = defaultNavItems }: NavigationProps) {
  return (
    <ul className="nav-list" role="menubar">
      {items.map(item => (
        <li key={item.to} role="none">
          <NavLink
            to={item.to}
            end={item.end}
            role="menuitem"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
