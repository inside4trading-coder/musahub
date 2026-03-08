import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { TopBar } from '@/components/TopBar';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-60 transition-all duration-200">
        <TopBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
