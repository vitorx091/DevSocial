import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import Notifications from "./Notifications";

import "../styles/Layout.css";

export default function Layout({ children }) {
  const { user, userData} = useAuth(); 
  return (
    <div className="layout">
      
      <div className="main-content">
        {children}
      </div>
      <Notifications/>
      <Sidebar user={user} userData={userData} />
    </div>
  );
}