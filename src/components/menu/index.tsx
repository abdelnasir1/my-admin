import { useLogout } from "@refinedev/core";
import { NavLink } from "react-router";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Content", to: "/content" },
  { label: "Students", to: "/students" },
  { label: "Reports", to: "/analytics" },
];

export const Menu = () => {
  const { mutate: logout } = useLogout();

  return (
    <nav className="menu">
      <ul>
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to}>{item.label}</NavLink>
          </li>
        ))}
      </ul>
      <button onClick={() => logout()}>Logout</button>
    </nav>
  );
};
