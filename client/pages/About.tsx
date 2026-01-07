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
  { icon: Star, title: "No Minimum Limit", text: "Premium printing available even for low quantity." },
  { icon: Layers, title: "Bulk Production", text: "Advanced production setup for bulk orders." },
  { icon: Palette, title: "Creative Design", text: "Creative and modern design approach." },
  { icon: Clock, title: "Ultra-fast Delivery", text: "We respect deadlines with quick turnaround." },
  { icon: DollarSign, title: "Best Pricing", text: "Affordable and transparent pricing structure." },
];

const values = [
  "Commitment to Quality",
  "Customer First Approach",
  "Innovation & Creativity",
  "Timely Delivery & Transparency"
];

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="container mx-auto px-4 pt-4 pb-4">
        <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900" />
      </div>
      
      {/* Hero Section */}
      <div className="bg-cream-900 text-cream-50 py-20 mt-10">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-4xl md:text-6xl font-bold mb-4"
          >
            About Prints24
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-1 bg-cream-400 mx-auto rounded-full"
          />
        </div>
      </div>

      {/* Introduction Section */}
      <section className="py-16 container mx-auto px-4 max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-8 text-lg text-cream-800 leading-relaxed"
        >
          <p>
            <span className="font-bold text-2xl text-cream-900">Prints24</span> is a modern, fast-growing Digital & Offset Printing Company, aiming to deliver 
            <span className="font-semibold italic text-cream-600"> Fast, Creative, and High-Quality</span> printing solutions to customers.
          </p>
          <p className="max-w-3xl mx-auto">
            We started Prints24 with the belief that today’s digital generation should have a platform where they can order any type of printing—from small quantities (Short Run) to large bulk orders—in a way that is:
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
                 <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center text-cream-900 mb-2">
                   <Check size={24} strokeWidth={3} />
                 </div>
                 <span className="font-serif font-bold text-xl text-cream-900">{item}</span>
               </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-cream-50 p-10 rounded-3xl border border-cream-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cream-900 text-white rounded-xl">
                  <Eye size={28} />
                </div>
                <h2 className="font-serif text-3xl font-bold text-cream-900">Our Vision</h2>
              </div>
              <p className="text-cream-700 text-lg leading-relaxed">
                To make Affordable, Stylish, and Premium Quality Printing accessible to every individual and every business.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-cream-50 p-10 rounded-3xl border border-cream-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-cream-900 text-white rounded-xl">
                  <Target size={28} />
                </div>
                <h2 className="font-serif text-3xl font-bold text-cream-900">Our Mission</h2>
              </div>
              <ul className="space-y-4 text-cream-700">
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-cream-500 mt-1 shrink-0" />
                  <span>Make modern printing easy and accessible for everyone.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-cream-500 mt-1 shrink-0" />
                  <span>Provide intelligent solutions with Quick Delivery and High Quality.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-cream-500 mt-1 shrink-0" />
                  <span>Offer better printing options for every budget.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Prints24 */}
      <section className="py-20 bg-cream-900 text-cream-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4">What Makes Prints24 Different?</h2>
            <p className="text-cream-200 max-w-2xl mx-auto">We combine traditional quality with modern speed and convenience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-cream-800 p-6 rounded-2xl text-center hover:bg-cream-700 transition-colors"
              >
                <div className="w-12 h-12 bg-cream-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                  <feature.icon size={24} />
                </div>
                <h3 className="font-serif font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-cream-200">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-16 bg-cream-50">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-center text-cream-900 mb-12">Our Core Values</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {values.map((val, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white px-8 py-4 rounded-full shadow-sm border border-cream-200 flex items-center gap-3 font-medium text-cream-800"
              >
                <Heart size={18} className="text-cream-500" fill="currentColor" />
                {val}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-cream-500 font-medium uppercase tracking-widest text-sm">The People Behind Prints24</span>
            <h2 className="font-serif text-4xl font-bold text-cream-900 mt-2">Meet Our Core Team</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-cream-50 p-6 rounded-2xl border border-cream-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-cream-200 rounded-full mb-4 flex items-center justify-center text-cream-900 group-hover:bg-cream-900 group-hover:text-cream-50 transition-colors">
                  <Users size={24} />
                </div>
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-cream-500 uppercase tracking-wider mb-1">{member.role}</h4>
                  <h3 className="font-serif text-xl font-bold text-cream-900">{member.name}</h3>
                </div>
                <div className="w-10 h-1 bg-cream-200 my-4 rounded-full group-hover:bg-cream-400 transition-colors"></div>
                <p className="text-sm text-cream-600 leading-relaxed">
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
