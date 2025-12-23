// sections/ServicesSection.tsx
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, FileText, Sticker, Mail, ImageIcon, Printer, BadgeCheck, ArrowRight } from "lucide-react";
import { ServiceItem } from "../types";

interface ServicesSectionProps {
  children: React.ReactNode;
  categories: any[];
  loadingCategories: boolean;
}

const services: ServiceItem[] = [
  {
    id: "cards",
    title: "Visiting Cards",
    description: "Premium matte, gloss, and textured business cards.",
    icon: CreditCard,
  },
  {
    id: "flyers",
    title: "Flyers & Brochures",
    description: "High-quality marketing materials for your business.",
    icon: FileText,
  },
  {
    id: "idcards",
    title: "ID Cards",
    description: "Durable employee and student identification cards.",
    icon: BadgeCheck,
  },
  {
    id: "letterhead",
    title: "Letterhead",
    description: "Professional official stationary.",
    icon: FileText,
  },
  {
    id: "stickers",
    title: "Stickers",
    description: "Custom shapes and sizes for branding.",
    icon: Sticker,
  },
  {
    id: "invites",
    title: "Invitations",
    description: "Elegant cards for weddings and events.",
    icon: Mail,
  },
  {
    id: "banners",
    title: "Flex & Banners",
    description: "Large format printing for maximum visibility.",
    icon: ImageIcon,
  },
  {
    id: "more",
    title: "Digital Printing",
    description: "Custom solutions for all your printing needs.",
    icon: Printer,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const ServicesSection: React.FC<ServicesSectionProps> = ({ 
  children, 
  categories, 
  loadingCategories 
}) => {
  return (
    <section className="pt-2 sm:pt-4 pb-6 sm:pb-8 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-2 sm:mb-4">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900 mb-3 sm:mb-4">
            Our Products
          </h2>
          <p className="text-sm sm:text-base text-cream-600 max-w-xl mx-auto mb-2 sm:mb-3">
            Select from our wide range of premium printed products specially
            crafted for you
          </p>
        </div>

        {/* Categories Slider */}
        {!loadingCategories && categories.length > 0 && (
          <>
            {children}
            <div className="text-center mt-6">
              <Link
                to="/digital-print"
                className="inline-flex items-center gap-2 bg-cream-900 text-cream-50 px-8 py-3 rounded-full font-medium hover:bg-cream-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Explore More
                <ArrowRight size={18} />
              </Link>
            </div>
          </>
        )}

        {/* Services Grid */}
        <div className="mt-8">
          <div className="text-center mb-8">
            <h3 className="font-serif text-3xl font-bold text-cream-900 mb-2">
              All Services
            </h3>
          </div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {services.map((service) => (
              <motion.div key={service.id} variants={itemVariants}>
                <Link to="/digital-print">
                  <div className="group h-full p-8 bg-cream-50 rounded-2xl hover:bg-cream-900 transition-all duration-300 cursor-pointer relative overflow-hidden border border-cream-100 hover:shadow-2xl">
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-cream-200 text-cream-900 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cream-800 group-hover:text-cream-50 transition-colors">
                        <service.icon size={28} />
                      </div>
                      <h3 className="font-serif text-xl font-semibold mb-3 text-cream-900 group-hover:text-cream-50 transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-cream-600 text-sm group-hover:text-cream-200 transition-colors">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;