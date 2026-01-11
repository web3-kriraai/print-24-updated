// sections/UploadSection.tsx
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const UploadSection: React.FC = () => {
  return (
    <section className="pt-24 pb-8 bg-cream-900 text-cream-50 text-center">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="mb-8 inline-flex items-center justify-center w-16 h-16 bg-cream-800 rounded-full">
            <ArrowRight size={32} className="text-amber-300" />
          </div>
          <h2 className="font-serif text-4xl font-bold mb-6">
            Have a Design Ready?
          </h2>
          <p className="text-xl text-cream-200 max-w-2xl mx-auto mb-10">
            Skip the templates and upload your own artwork. Our automated
            system checks for errors instantly.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-cream-300 mb-10">
            <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
              PDF
            </span>
            <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
              AI
            </span>
            <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
              PSD
            </span>
            <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
              JPG/PNG
            </span>
          </div>
          <Link
            to="/upload"
            className="bg-cream-50 text-cream-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-cream-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            Upload Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default UploadSection;