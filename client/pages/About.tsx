import React from 'react';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import {
  Target,
  Eye,
  Zap,
  Layers,
  Palette,
  Clock,
  DollarSign,
  Users,
  Briefcase,
  Heart,
  Check,
  Star
} from 'lucide-react';

const teamMembers = [
  { role: "Founder & Director", name: "Name Placeholder", desc: "Vision, Business Strategy & Decision Making" },
  { role: "Chief Executive Officer (CEO)", name: "Kajal Sharma", desc: "Leads the company with strong direction and clarity" },
  { role: "Chief Operating Officer (COO)", name: "Name Placeholder", desc: "Coordination, Daily Operations & Workflow Management" },
  { role: "HR", name: "Name Placeholder", desc: "Human Resources & Team Management" },
  { role: "Marketing Head", name: "Name Placeholder", desc: "Branding, Promotions & Client Acquisition" },
  { role: "Production Manager", name: "Name Placeholder", desc: "Machine Management, Quality Control & Output" },
  { role: "Design Head / Creative Lead", name: "Name Placeholder", desc: "Layouts, Templates, Content Designing & Branding" },
  { role: "Sales Manager", name: "Name Placeholder", desc: "Customer Handling, Order Conversion & Follow-ups" },
  { role: "Accounts & Billing Manager", name: "Name Placeholder", desc: "Billing, Invoices, Vendor Payments & Records" },
  { role: "Customer Support Lead", name: "Name Placeholder", desc: "Client Queries, Support & Service Updates" },
  { role: "Logistics & Dispatch Officer", name: "Name Placeholder", desc: "Packaging, Shipment Tracking & Delivery Coordination" },
];

const features = [
  { icon: Star, title: "No Minimum Limit", text: "Premium printing available even for low quantity.", color: "#00aeef" },
  { icon: Layers, title: "Bulk Production", text: "Advanced production setup for bulk orders.", color: "#ec008c" },
  { icon: Palette, title: "Creative Design", text: "Creative and modern design approach.", color: "#ffd500" },
  { icon: Clock, title: "Ultra-fast Delivery", text: "We respect deadlines with quick turnaround.", color: "#00aeef" },
  { icon: DollarSign, title: "Best Pricing", text: "Affordable and transparent pricing structure.", color: "#ec008c" },
];

const values = [
  "Commitment to Quality",
  "Customer First Approach",
  "Innovation & Creativity",
  "Timely Delivery & Transparency"
];

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 pt-4 pb-4">
        <BackButton fallbackPath="/" label="Back to Home" className="text-[#00aeef] hover:text-[#ec008c] transition-colors" />
      </div>

      {/* Hero Section - Light Gradient */}
      <div className="bg-gradient-to-r from-[#e6f7ff] via-[#fff0f8] to-[#ffe6f5] text-gray-900 py-16 md:py-20 mt-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-[#00aeef]/20 rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#ec008c]/20 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-[#ffd500]/30 rounded-full"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-[#00aeef] to-[#ec008c] bg-clip-text text-transparent"
          >
            About Prints24
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-16 sm:w-20 md:w-24 h-1 bg-gradient-to-r from-[#00aeef] via-[#ec008c] to-[#ffd500] mx-auto rounded-full"
          />
        </div>
      </div>

      {/* Introduction Section - Light Cyan Background */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-[#e6f7ff] to-white container mx-auto px-4 sm:px-6 max-w-5xl rounded-3xl my-6 sm:my-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-6 sm:space-y-8 text-base sm:text-lg text-gray-800 leading-relaxed"
        >
          <p>
            <span className="font-bold text-2xl bg-gradient-to-r from-[#00aeef] to-[#ec008c] bg-clip-text text-transparent">Prints24</span> is a modern, fast-growing Digital & Offset Printing Company, aiming to deliver
            <span className="font-semibold italic text-[#ec008c]"> Fast, Creative, and High-Quality</span> printing solutions to customers.
          </p>
          <p className="max-w-3xl mx-auto">
            We started Prints24 with the belief that today's digital generation should have a platform where they can order any type of printing—from small quantities (Short Run) to large bulk orders—in a way that is:
          </p>

          <div className="flex justify-center gap-4 md:gap-12 py-6">
            {['Easy', 'Fast', 'Reliable'].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white mb-2 ${i === 0 ? 'bg-[#00aeef]' : i === 1 ? 'bg-[#ec008c]' : 'bg-[#ffd500]'
                  }`}>
                  <Check size={24} strokeWidth={3} />
                </div>
                <span className="font-serif font-bold text-xl text-gray-900">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Vision & Mission */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-10 rounded-3xl border-2 border-[#00aeef] hover:shadow-2xl hover:shadow-[#00aeef]/20 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-[#00aeef] to-[#0088cc] text-white rounded-xl shadow-lg">
                  <Eye size={28} />
                </div>
                <h2 className="font-serif text-3xl font-bold bg-gradient-to-r from-[#00aeef] to-[#0088cc] bg-clip-text text-transparent">Our Vision</h2>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">
                To make Affordable, Stylish, and Premium Quality Printing accessible to every individual and every business.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-10 rounded-3xl border-2 border-[#ec008c] hover:shadow-2xl hover:shadow-[#ec008c]/20 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-[#ec008c] to-[#cc0077] text-white rounded-xl shadow-lg">
                  <Target size={28} />
                </div>
                <h2 className="font-serif text-3xl font-bold bg-gradient-to-r from-[#ec008c] to-[#cc0077] bg-clip-text text-transparent">Our Mission</h2>
              </div>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-[#00aeef] mt-1 shrink-0" />
                  <span>Make modern printing easy and accessible for everyone.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-[#ec008c] mt-1 shrink-0" />
                  <span>Provide intelligent solutions with Quick Delivery and High Quality.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-[#ffd500] mt-1 shrink-0" />
                  <span>Offer better printing options for every budget.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Prints24 - Dark with Colorful Cards */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 bg-[#00aeef] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-[#ec008c] rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12 sm:mb-16 px-4">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">What Makes Prints24 Different?</h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base">We combine traditional quality with modern speed and convenience.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl text-center hover:bg-white/20 transition-all duration-300 border border-white/10 hover:scale-105"
                style={{ borderTopColor: feature.color, borderTopWidth: '3px' }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg" style={{ backgroundColor: feature.color }}>
                  <feature.icon size={24} />
                </div>
                <h3 className="font-serif font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-300">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Values - Yellow Tint */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-[#fff9e6] to-white">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12 px-4">Our Core Values</h2>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 px-4">
            {values.map((val, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`bg-white px-8 py-4 rounded-full shadow-md border-2 flex items-center gap-3 font-medium text-gray-800 hover:scale-105 transition-transform ${idx % 3 === 0 ? 'border-[#00aeef] hover:shadow-[#00aeef]/30' :
                  idx % 3 === 1 ? 'border-[#ec008c] hover:shadow-[#ec008c]/30' :
                    'border-[#ffd500] hover:shadow-[#ffd500]/30'
                  }`}
              >
                <Heart size={18} className={idx % 3 === 0 ? 'text-[#00aeef]' : idx % 3 === 1 ? 'text-[#ec008c]' : 'text-[#ffd500]'} fill="currentColor" />
                {val}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 px-4">
            <span className="text-[#ec008c] font-medium uppercase tracking-widest text-xs sm:text-sm">The People Behind Prints24</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mt-2">Meet Our Core Team</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#00aeef]"
              >
                <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center text-white transition-all duration-300 ${idx % 3 === 0 ? 'bg-gradient-to-br from-[#00aeef] to-[#0088cc] group-hover:scale-110' :
                  idx % 3 === 1 ? 'bg-gradient-to-br from-[#ec008c] to-[#cc0077] group-hover:scale-110' :
                    'bg-gradient-to-br from-[#ffd500] to-[#ffbb00] group-hover:scale-110'
                  }`}>
                  <Users size={24} />
                </div>
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-[#ec008c] uppercase tracking-wider mb-1">{member.role}</h4>
                  <h3 className="font-serif text-xl font-bold text-gray-900">{member.name}</h3>
                </div>
                <div className={`w-10 h-1 my-4 rounded-full transition-all ${idx % 3 === 0 ? 'bg-[#00aeef]' :
                  idx % 3 === 1 ? 'bg-[#ec008c]' :
                    'bg-[#ffd500]'
                  }`}></div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {member.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default About;
