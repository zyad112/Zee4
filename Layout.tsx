import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';

export default function Layout() {
  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-7xl flex">
        {/* Left Sidebar */}
        <div className="w-20 xl:w-72 flex-shrink-0 border-r border-zinc-800 h-screen sticky top-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 border-r border-zinc-800 min-h-screen">
          <Outlet />
        </main>

        {/* Right Panel */}
        <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0 h-screen sticky top-0">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
