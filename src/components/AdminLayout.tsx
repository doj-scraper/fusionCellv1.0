import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  { label: 'Dashboard', items: [{ to: '/', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Commerce',
    items: [
      { to: '/sales', label: 'Orders', icon: ShoppingCart },
      { to: '/catalog', label: 'Products', icon: Package },
      { to: '/stock', label: 'Inventory', icon: Warehouse },
    ],
  },
  { label: 'Analytics', items: [{ to: '/sales', label: 'Sales', icon: LineChart }] },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'Overview', description: 'Monitor orders, stock health, and daily activity.' },
  '/catalog': { title: 'Catalog', description: 'Manage product details, pricing, and availability.' },
  '/stock': { title: 'Inventory', description: 'Track low stock items and make fast adjustments.' },
  '/sales': { title: 'Orders', description: 'Review and update customer order activity.' },
  '/admin-search': { title: 'Search', description: 'Find orders, SKUs, products, and customers quickly.' },
};

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') ?? '');
  }, [location.search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        navigate('/catalog');
      }
      if (event.key.toLowerCase() === 'o' && event.metaKey) {
        event.preventDefault();
        navigate('/sales');
      }
      if (event.key.toLowerCase() === 'p' && event.metaKey) {
        event.preventDefault();
        navigate('/catalog');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/admin-search?q=${encodeURIComponent(searchQuery.trim())}`);
    setMobileOpen(false);
  };

  const currentMeta = useMemo(() => {
    if (location.pathname.startsWith('/sales/')) {
      return { title: 'Order Detail', description: 'Review status, customer destination, and line items.' };
    }
    return pageMeta[location.pathname] ?? pageMeta['/'];
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_52%)]" />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="relative z-10 flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[282px] flex-col border-r border-white/10 bg-sidebar-background/95 backdrop-blur-xl transition-transform md:static md:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="border-b border-sidebar-border/80 px-5 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Control</p>
                <h1 className="mt-1 text-xl font-semibold text-sidebar-foreground">Ghost Admin</h1>
              </div>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground md:hidden" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="mt-1 truncate text-sm font-medium text-sidebar-foreground">{user?.email}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                <div className="mt-2 space-y-1.5">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={`${to}-${label}`}
                      to={to}
                      end={to === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                            : 'text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground'
                        )
                      }
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-sidebar-border/80 p-4">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-white/5" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-4 md:px-8">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="md:hidden"><Menu className="h-5 w-5" /></Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Admin workspace</p>
                <div className="flex flex-col gap-0.5 md:flex-row md:items-end md:gap-3">
                  <h2 className="truncate text-2xl font-semibold tracking-tight">{currentMeta.title}</h2>
                  <p className="truncate text-sm text-muted-foreground">{currentMeta.description}</p>
                </div>
              </div>

              <form onSubmit={submitSearch} className="hidden items-center gap-2 md:flex">
                <div className="relative w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    aria-label="Search admin interface"
                    placeholder="Search orders, SKU, product name..."
                    className="h-11 rounded-xl border-white/10 bg-white/5 pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" className="h-11 rounded-xl border-white/10 bg-white/5">Search</Button>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl border-white/10 bg-white/5">
                  <Bell className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
