import { NavLink } from 'react-router-dom';
import { Home, LayoutDashboard, Target, GraduationCap, BarChart3, Settings, FileVideo, TerminalSquare, SlidersHorizontal, UserCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ isOpen, setIsOpen }) {
  const routes = [
    { name: 'Dashboard', path: '/', icon: <Home size={20} /> },
    { name: 'Practice Workspace', path: '/student', icon: <TerminalSquare size={20} /> },
    { name: 'My Submissions', path: '/submissions', icon: <FileVideo size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
    { name: 'Trainer Panel', path: '/trainer', icon: <GraduationCap size={20} /> },
    { name: 'Admin Operations', path: '/admin', icon: <SlidersHorizontal size={20} /> },
  ];

  return (
    <motion.aside
      animate={{ width: isOpen ? 260 : 80 }}
      className="app-sidebar h-screen bg-white border-r border-gray-200 flex flex-col justify-between sticky top-0 left-0 z-40 shadow-sm"
    >
      <div>
         <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
           {isOpen && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                 <img
                   src="/amypo-logo.png"
                   alt="Amypo"
                   className="adaptive-logo h-8 w-auto max-w-[190px] object-contain select-none"
                   draggable="false"
                 />
             </motion.div>
           )}
           {!isOpen && (
             <div className="w-full flex justify-center">
               <img
                 src="/amypo-logo.png"
                 alt="Amypo"
                 className="adaptive-logo h-8 w-8 object-contain select-none"
                 draggable="false"
               />
             </div>
           )}
         </div>

         <div className="py-6 px-4 space-y-2">
            <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2 ${!isOpen && 'text-center'}`}>
              {isOpen ? 'Main Menu' : 'Menu'}
            </p>
            {routes.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                      : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 font-medium'
                  } ${!isOpen && 'justify-center'}`
                }
                title={!isOpen ? route.name : undefined}
              >
                <div className="flex items-center">{route.icon}</div>
                {isOpen && <span className="text-sm whitespace-nowrap">{route.name}</span>}
              </NavLink>
            ))}
         </div>
      </div>

      <div className="p-4 border-t border-gray-100">
         <NavLink
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 font-medium ${!isOpen && 'justify-center'}`}
            title={!isOpen ? 'Settings' : undefined}
         >
           <Settings size={20} />
           {isOpen && <span className="text-sm">Configurations</span>}
         </NavLink>
      </div>
    </motion.aside>
  );
}
