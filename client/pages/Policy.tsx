import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import { 
  Shield, 
  FileText, 
  RefreshCw, 
  Ban, 
  AlertTriangle, 
  Lock,
  ChevronRight,
  ScrollText
} from 'lucide-react';

const Policy: React.FC = () => {
  const [activeSection, setActiveSection] = useState('terms');

  // Simple scroll spy to update active section (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      const sections = ['terms', 'refund', 'cancellation', 'privacy'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < 300) {
            setActiveSection(section);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Offset for sticky header
      const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4 pt-4 pb-4">
        <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900" />
      </div>
      <div className="bg-cream-900 text-cream-50 py-16 mb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Legal Policies</h1>
          <p className="text-cream-200 max-w-2xl mx-auto">
            Transparency is key to our service. Please read our terms and conditions carefully.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-cream-100 overflow-hidden">
              <div className="p-4 bg-cream-100 border-b border-cream-200 font-bold text-cream-900 flex items-center gap-2">
                <ScrollText size={18} /> Table of Contents
              </div>
              <nav className="p-2 space-y-1">
                <button 
                  onClick={() => scrollTo('terms')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeSection === 'terms' ? 'bg-cream-900 text-cream-50' : 'text-cream-600 hover:bg-cream-50'}`}
                >
                  Terms of Service {activeSection === 'terms' && <ChevronRight size={14} />}
                </button>
                <button 
                  onClick={() => scrollTo('refund')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeSection === 'refund' ? 'bg-cream-900 text-cream-50' : 'text-cream-600 hover:bg-cream-50'}`}
                >
                  Refund Policy {activeSection === 'refund' && <ChevronRight size={14} />}
                </button>
                <button 
                  onClick={() => scrollTo('cancellation')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeSection === 'cancellation' ? 'bg-cream-900 text-cream-50' : 'text-cream-600 hover:bg-cream-50'}`}
                >
                  Cancellation Policy {activeSection === 'cancellation' && <ChevronRight size={14} />}
                </button>
                <button 
                  onClick={() => scrollTo('privacy')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeSection === 'privacy' ? 'bg-cream-900 text-cream-50' : 'text-cream-600 hover:bg-cream-50'}`}
                >
                  Privacy Policy {activeSection === 'privacy' && <ChevronRight size={14} />}
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4 space-y-12">
            
            {/* Terms of Service */}
            <section id="terms" className="scroll-mt-28">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-cream-100">
                <div className="flex items-center gap-3 mb-6 border-b border-cream-100 pb-4">
                  <div className="p-2 bg-cream-100 rounded-lg text-cream-900"><FileText size={24} /></div>
                  <h2 className="font-serif text-2xl font-bold text-cream-900">Terms of Service</h2>
                </div>
                
                <div className="space-y-6 text-cream-800 leading-relaxed">
                  <p>
                    Prints24 provides digital and offset printing services to B2B, B2C, corporate clients, small businesses, and individuals. 
                    By using our services, you agree to the following terms:
                  </p>

                  <div className="bg-cream-50 p-5 rounded-xl border border-cream-200">
                    <h3 className="font-bold text-cream-900 mb-2 flex items-center gap-2"><Shield size={16} /> Customer Responsibility</h3>
                    <p className="text-sm">The customer is fully responsible for the legality, originality, copyright ownership, and authenticity of all submitted designs, documents, and artwork.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-cream-900 mb-2 text-lg">Prohibited Printing</h3>
                    <p className="text-sm mb-3">We do strictly NOT allow printing of content that is illegal, forged, duplicate, copyrighted without permission, objectionable, religiously sensitive, government ID, currency, or any material restricted under Indian law.</p>
                    <div className="flex items-start gap-2 text-red-600 text-xs font-medium bg-red-50 p-3 rounded-lg">
                      <Ban size={16} className="shrink-0 mt-0.5" />
                      If such files are received, the order may be cancelled and legal action may be taken.
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-cream-900 mb-2">Color Disclaimer</h3>
                      <p className="text-sm">100% exact color matching is not guaranteed in digital or offset processes. If future reprints require identical colors, color profiling will be required and extra fees will apply.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-cream-900 mb-2">Design Approval</h3>
                      <p className="text-sm">After customer approval, Prints24 is not responsible for spelling mistakes, low-resolution images, incorrect alignment, missing elements, or design issues found later.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-cream-900 mb-3">Printing Accuracy Policy</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-cream-400 rounded-full mt-1.5"></div>
                        <span>If printing errors impact 5%–50% of the product, we provide a proportional discount.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-cream-400 rounded-full mt-1.5"></div>
                        <span>If more than 50% is defective due to production errors, we provide a free reprint.</span>
                      </li>
                    </ul>
                    <p className="text-xs mt-2 text-cream-500 italic">*For approved reprints, printing is free, but courier/delivery charges must be paid by the customer.</p>
                  </div>

                  <div>
                     <h3 className="font-bold text-cream-900 mb-2">Liability & Rights</h3>
                     <p className="text-sm mb-2"><strong>Limited Liability:</strong> In cases of courier delay, product damage, color mismatch, disputes, or loss, Prints24’s maximum liability is limited to the printing value of the order only.</p>
                     <p className="text-sm mb-2"><strong>Right to Refuse:</strong> Prints24 reserves the right to cancel, reject, suspend, or modify any order, customer account, pricing, or policies without prior notice.</p>
                     <p className="text-sm"><strong>Jurisdiction:</strong> All legal matters fall under Jaipur, Rajasthan (India) jurisdiction only.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-cream-900 mb-2">Payments & Communication</h3>
                    <p className="text-sm mb-2">Payments must be made only through officially verified Prints24 company banking channels. Payments made to personal accounts are not the responsibility of Prints24.</p>
                    <p className="text-sm">By ordering, customers agree to receive transactional and promotional communications through SMS, WhatsApp, email, or phone.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Refund Policy */}
            <section id="refund" className="scroll-mt-28">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-cream-100">
                <div className="flex items-center gap-3 mb-6 border-b border-cream-100 pb-4">
                  <div className="p-2 bg-cream-100 rounded-lg text-cream-900"><RefreshCw size={24} /></div>
                  <h2 className="font-serif text-2xl font-bold text-cream-900">Refund Policy</h2>
                </div>
                
                <div className="space-y-4 text-cream-800">
                  <p className="font-medium">All products are custom-made and non-refundable.</p>
                  
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h3 className="font-bold text-red-900 mb-2 text-sm flex items-center gap-2"><AlertTriangle size={16} /> No Refunds Provided For:</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-red-800">
                      <li>• Design dissatisfaction</li>
                      <li>• Minor color variations</li>
                      <li>• Errors discovered after customer approval</li>
                      <li>• Courier delays</li>
                      <li>• Expected variation in material/texture</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3">
                    <RefreshCw size={20} className="text-green-700 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-800">
                      <strong>Reprint Guarantee:</strong> If production errors affect more than 50% of the order, we provide a free reprint—not a refund.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Cancellation Policy */}
            <section id="cancellation" className="scroll-mt-28">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-cream-100">
                <div className="flex items-center gap-3 mb-6 border-b border-cream-100 pb-4">
                  <div className="p-2 bg-cream-100 rounded-lg text-cream-900"><Ban size={24} /></div>
                  <h2 className="font-serif text-2xl font-bold text-cream-900">Cancellation Policy</h2>
                </div>
                
                <div className="space-y-4 text-cream-800">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cream-100 flex items-center justify-center shrink-0 text-cream-900 font-bold text-xs">1</div>
                      <span>Orders may be cancelled <strong>only before printing begins</strong>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cream-100 flex items-center justify-center shrink-0 text-cream-900 font-bold text-xs">2</div>
                      <span>Once production has started, modification or cancellation is not allowed.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cream-100 flex items-center justify-center shrink-0 text-cream-900 font-bold text-xs">3</div>
                      <span>If cancelled before printing, setup, processing, and material costs will be deducted from the refund.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Privacy Policy */}
            <section id="privacy" className="scroll-mt-28">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-cream-100">
                <div className="flex items-center gap-3 mb-6 border-b border-cream-100 pb-4">
                  <div className="p-2 bg-cream-100 rounded-lg text-cream-900"><Lock size={24} /></div>
                  <h2 className="font-serif text-2xl font-bold text-cream-900">Privacy Policy</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 text-cream-800 text-sm">
                  <div>
                    <h3 className="font-bold text-cream-900 mb-2">Information We Collect</h3>
                    <p className="mb-4 text-cream-600">Customer name, business details, email, phone, delivery address, and printing design files.</p>

                    <h3 className="font-bold text-cream-900 mb-2">How Information Is Used</h3>
                    <p className="mb-4 text-cream-600">For order processing, delivery, updates, support, and service improvement.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-cream-900 mb-2">Data Security & Sharing</h3>
                    <p className="mb-4 text-cream-600">All customer files and information remain confidential and shared only with printing partners, couriers, or payment gateways as needed.</p>

                    <h3 className="font-bold text-cream-900 mb-2">Customer Rights</h3>
                    <p className="text-cream-600">Customers may receive promotional communications (opt-out available) and may request access/correction of stored information.</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Policy;