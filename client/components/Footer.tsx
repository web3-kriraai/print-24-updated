import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  return (
    <footer className="w-full flex relative flex-col lg:flex-row bg-gradient-to-br from-blue-50/80 via-white to-purple-50/80 overflow-hidden">
      {/* Subtle Decorative Animated Gradient Top Border */}
      <motion.div
        className="absolute top-0 left-0 w-full h-px bg-[linear-gradient(90deg,#0ea5e9,#3b82f6,#8b5cf6,#d946ef,#f43f5e,#f97316,#eab308,#22c55e,#0ea5e9)] z-20"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        style={{ backgroundSize: "200% 200%" }}
      />



      {/* Animated Background Blobs */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl z-0 pointer-events-none"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl z-0 pointer-events-none"
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Left Side - Image Section */}
      <div
        className="w-full lg:w-[350px] relative flex-shrink-0 z-10"
        style={{ minHeight: '100%' }}
      >
        <img
          src="/footer.png"
          alt="Prints24 Creative"
          className="w-full h-auto object-contain lg:w-[250px] absolute top-20 left-12 block"
          style={{ objectPosition: 'center top' }}
        />

      </div>

      {/* Right Side - Content Section */}
      <div className="flex-1 relative pt-16 sm:pt-20 pb-10 px-4 sm:px-8 lg:px-12 overflow-hidden z-10">





        <div className="relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">

            {/* Company Info */}
            <div className="space-y-6">
              <motion.h3
                className="font-serif text-3xl font-bold bg-gradient-to-r from-blue-700 via-purple-600 to-pink-600 bg-clip-text text-transparent inline-block tracking-tight cursor-default"
                whileHover={{ scale: 1.02 }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% auto" }}
              >
                Prints24
              </motion.h3>
              <p className="text-slate-600 text-[15px] leading-relaxed font-light tracking-wide max-w-xs">
                Elevating print with modern digital solutions. Creative, fast, and uncompromising on quality.
              </p>
              <div className="flex space-x-5 pt-2">
                <a href="#" className="text-slate-400 hover:text-blue-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"><Facebook size={20} /></a>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"><Twitter size={20} /></a>
                <a href="#" className="text-slate-400 hover:text-pink-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"><Instagram size={20} /></a>
                <a href="#" className="text-slate-400 hover:text-blue-700 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"><Linkedin size={20} /></a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-serif text-lg font-bold text-slate-900 mb-8 tracking-wide">Quick Links</h4>
              <ul className="space-y-4 text-[15px] font-medium text-slate-600">
                <li><Link to="/" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">Home</Link></li>
                <li><Link to="/services" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">Digital Print</Link></li>
                <li><Link to="/upload" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">Upload Files</Link></li>
                <li><Link to="/about" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">About Us</Link></li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-serif text-lg font-bold text-slate-900 mb-8 tracking-wide">Customer Support</h4>
              <ul className="space-y-4 text-[15px] font-medium text-slate-600">
                <li><Link to="/policy" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">Privacy Policy</Link></li>
                <li><Link to="/policy" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">Terms & Conditions</Link></li>
                <li><Link to="/policy" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">Shipping Policy</Link></li>
                <li><Link to="/login" className="block hover:text-blue-600 hover:translate-x-2 transition-all duration-300 ease-out">My Account</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-serif text-lg font-bold text-slate-900 mb-8 tracking-wide">Contact Us</h4>
              <ul className="space-y-5 text-[15px] text-slate-600 font-light">
                <li className="flex items-start gap-4 group">
                  <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                    <MapPin size={18} className="text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="mt-1.5">123 Print Street, Creative District,<br />New York, NY 10001</span>
                </li>
                <li className="flex items-center gap-4 group">
                  <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                    <Phone size={18} className="text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span>+1 (555) 123-4567</span>
                </li>
                <li className="flex items-center gap-4 group">
                  <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                    <Mail size={18} className="text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span>support@prints24.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 font-light">
            <p>&copy; {new Date().getFullYear()} Prints24. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Sitemap</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
