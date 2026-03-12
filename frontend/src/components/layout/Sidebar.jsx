import { NavLink } from 'react-router-dom';
import { LayoutGrid, BookOpen, GraduationCap, Code, ShieldCheck, Settings, History, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ isOpen, setIsOpen }) {
  const routes = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/' },
    { icon: BookOpen, label: 'Learning Roadmap', path: '/roadmap' },
    { icon: GraduationCap, label: 'Teacher Portal', path: '/teacher' },
    { icon: Code, label: 'Editor', path: '/student' },
    { icon: ShieldCheck, label: 'Trainer Panel', path: '/trainer' },
    { icon: Settings, label: 'Admin', path: '/admin' },
    { icon: History, label: 'Submissions', path: '/submissions' },
    { icon: LineChart, label: 'Analytics', path: '/analytics' },
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
                title={!isOpen ? route.label : undefined}
              >
                <div className="flex items-center min-w-[20px]">
                  <route.icon size={20} />
                </div>
                {isOpen && <span className="text-sm whitespace-nowrap">{route.label}</span>}
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
