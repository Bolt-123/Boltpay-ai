import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Clock,
  LogOut,
  Zap,
  Check,
  Tag,
  X
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ElementType;
  text: string;
  active?: boolean;
}

const SidebarItem = ({ icon: Icon, text, active }: SidebarItemProps) => (
  <button
    type="button"
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-purple-50 text-purple-700 font-medium' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={active ? 'text-purple-600' : 'text-gray-400'} />
    <span>{text}</span>
  </button>
);

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 size={14} />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock size={14} />
      Pending
    </span>
  );
};

interface Invoice {
  id: string;
  client: string;
  description: string;
  category: string;
  amount: string;
  status: string;
  date: string;
  link: string;
}

interface ToastNotification {
  id: string;
  client: string;
  amount: string;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const seenPaidIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/invoices');
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.invoices)) {
        const formattedInvoices: Invoice[] = data.invoices.map((inv: any) => ({
          id: inv.id || inv.normalized_id || `INV-${Date.now()}`,
          client: inv.client_name || 'Client',
          description: inv.description || 'N/A',
          category: inv.category || 'General Services',
          amount: typeof inv.amount === 'number' 
            ? `$${inv.amount.toFixed(2)}` 
            : `$${parseFloat(inv.amount || 0).toFixed(2)}`,
          status: inv.status || 'Pending',
          date: inv.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          link: inv.payment_link || '#'
        }));

        formattedInvoices.forEach((inv) => {
          if (inv.status === 'Paid') {
            if (!seenPaidIdsRef.current.has(inv.id)) {
              if (!isInitialLoadRef.current) {
                setToast({
                  id: inv.id,
                  client: inv.client,
                  amount: inv.amount
                });
              }
              seenPaidIdsRef.current.add(inv.id);
            }
          }
        });

        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
        }

        setInvoices(formattedInvoices.reverse());
      }
    } catch (err) {
      console.error('Failed to fetch invoices from backend:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    const interval = setInterval(fetchInvoices, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setPrompt('');
        await fetchInvoices();
      } else {
        alert('Error creating invoice: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to communicate with backend:', err);
      alert('Could not connect to Flask backend. Ensure app.py is running on port 5000.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    if (text && text !== '#') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans relative">
      {/* Real-time Webhook Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-4 rounded-xl shadow-2xl border border-purple-500/30">
          <div className="w-9 h-9 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 border border-green-500/40">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              <span>Payment Reconciled!</span>
              <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30 font-medium">Webhook Live</span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Received <span className="font-semibold text-white">{toast.amount}</span> from <span className="font-semibold text-white">{toast.client}</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setToast(null)}
            className="ml-3 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xl tracking-tight">
            <Zap size={24} className="fill-purple-600 text-purple-600" />
            BoltPay<span className="text-gray-900">.ai</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} text="Dashboard" active />
          <SidebarItem icon={FileText} text="Invoices" />
          <SidebarItem icon={Users} text="Clients" />
          <SidebarItem icon={Settings} text="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button type="button" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={20} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-800">Overview</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">Sandbox Environment</div>
            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold border border-purple-200 shadow-sm">
              RK
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* AI Generator Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-white">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-500" />
                  Agentic Invoice Generator
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tell the AI what you worked on. It will extract details, categorize for accounting, and create a PayPal checkout link.
                </p>
              </div>
              
              <form onSubmit={handleGenerate} className="p-6">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., I designed a logo for Apple for $5000 and it is due by 20 of November 2026"
                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white transition-all resize-none text-gray-700 placeholder-gray-400"
                  />
                  <div className="absolute bottom-4 right-4">
                    <button 
                      type="submit"
                      disabled={isGenerating || !prompt.trim()}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all ${
                        isGenerating || !prompt.trim() 
                          ? 'bg-purple-300 cursor-not-allowed' 
                          : 'bg-purple-600 hover:bg-purple-700 hover:shadow-md active:transform active:scale-95'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap size={18} className="fill-current" />
                          Generate & Create Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            {/* Invoices List */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Invoices</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-medium">Client</th>
                        <th className="px-6 py-4 font-medium">Description</th>
                        <th className="px-6 py-4 font-medium">Category</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                        <th className="px-6 py-4 font-medium">Amount</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{invoice.client}</td>
                          <td className="px-6 py-4 text-gray-600 truncate max-w-[180px]">{invoice.description}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <Tag size={12} className="text-purple-500" />
                              {invoice.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{invoice.date}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{invoice.amount}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(invoice.id, invoice.link)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                copiedId === invoice.id
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-purple-600'
                              }`}
                            >
                              {copiedId === invoice.id ? (
                                <>
                                  <Check size={16} />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={16} />
                                  Copy Link
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {invoices.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No invoices generated yet. Use the prompt above to create your first one.
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}