type NavItemType = 'generate' | 'templates' | 'tasks' | 'history' | 'settings';

interface SidebarProps {
  activeItem: NavItemType;
  onNavigate: (item: NavItemType) => void;
}

interface NavItem {
  id: NavItemType;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'generate', icon: '🎬', label: '生成' },
  { id: 'templates', icon: '📋', label: '模板' },
  { id: 'tasks', icon: '📝', label: '任务' },
  { id: 'history', icon: '🕐', label: '历史' },
  { id: 'settings', icon: '⚙️', label: '设置' },
];

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-full w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-50">
      {/* Logo/Icon */}
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-8 shadow-lg">
        <span className="text-white text-2xl">🎥</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-6">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              flex flex-col items-center gap-1 group transition-all duration-200
              ${activeItem === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
              ${activeItem === item.id
                ? 'bg-blue-50 shadow-md'
                : 'hover:bg-gray-100'
              }
            `}>
              <span className="text-xl">{item.icon}</span>
            </div>
            <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom User Avatar */}
      <div className="mt-auto">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border-2 border-white shadow-md">
          <span className="text-gray-600 text-sm font-bold">AI</span>
        </div>
      </div>
    </div>
  );
}
