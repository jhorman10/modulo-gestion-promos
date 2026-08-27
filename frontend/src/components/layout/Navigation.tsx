import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
}

const defaultNavItems: NavItem[] = [
  { to: '/promotions', label: 'Promotions' },
  { to: '/promotions/new', label: 'New Promotion' },
  { to: '/summary', label: 'Summary' },
];

export interface NavigationProps {
  items?: NavItem[];
}

export function Navigation({ items = defaultNavItems }: NavigationProps) {
  return (
    <ul className="nav-list" role="menubar">
      {items.map((item) => (
        <li key={item.to} role="none">
          <NavLink
            to={item.to}
            role="menuitem"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
