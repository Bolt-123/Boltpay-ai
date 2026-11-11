import React, { useState } from 'react';
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
  Check
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, text, active }) => (
  <button
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

const StatusBadge = ({ status }) => {
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

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Mock data for initial state
  const [invoices, setInvoices] = useState([
    {
      id: 1,
      client: 'Ada Lovelace',
      description: 'Brand Identity & Logo Design',
      amount: '$150.00',
      status: 'Pending',
      date: 'Nov 3, 2026',
      link: 'https://paypal.me/sandbox/inv-1'
    },
    {
      id: 2,
      client: 'Tobi O.',
      description: 'E-commerce Landing Page UI',
      amount: '$850.00',
      status: 'Paid',
      date: 'Oct 28, 2026',
      link: 'https://paypal.me/sandbox/inv-2'
    }
  ]);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    
    // Simulate AI processing and API call delay
    setTimeout(() => {
      const newInvoice = {
        id: Date.now(),
        client: 'Extracted Client', // In the real app, LangGraph extracts this
        description: prompt, 
        amount: '$0.00', // In the real app, LangGraph extracts this
        status: 'Pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        link: `https://paypal.me/sandbox/inv-${Date.now().toString().slice(-4)}`
      };
      
      setInvoices([newInvoice, ...invoices]);
      setPrompt('');
      setIsGenerating(false);
    }, 1500);
  };

  const copyToClipboard = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
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
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
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
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* AI Generator Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-white">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-500" />
                  Agentic Invoice Generator
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tell the AI what you worked on. It will generate an invoice and a PayPal checkout link.
                </p>
              </div>
              
              <form onSubmit={handleGenerate} className="p-6">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., I designed a logo for Ada, $150, due Friday..."
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
                          <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]">{invoice.description}</td>
                          <td className="px-6 py-4 text-gray-500">{invoice.date}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{invoice.amount}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
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