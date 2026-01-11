// sections/AboutSection.tsx
import React from "react";
import { motion } from "framer-motion";

const AboutSection: React.FC = () => {
  return (
    <section className="pt-8 pb-24 bg-cream-100 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white p-10 md:p-16 rounded-3xl shadow-xl"
          >
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-bold text-cream-900 mb-2">
                About Prints24
              </h2>
              <div className="w-24 h-1 bg-cream-400 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-8 text-cream-800 leading-relaxed">
              <p className="text-lg">
                Prints24 is a modern, fast-growing{" "}
                <span className="font-semibold">
                  Digital & Offset Printing Company
                </span>
                , whose aim is to provide Fast, Creative, and High-Quality
                printing solutions to customers.
              </p>
              <p>
                We started Prints24 with the idea that today's digital
                generation should get a platform where they can avail all
                types of printing services, from small quantities (Short Run)
                to Bulk Printing, in an easy, fast, and reliable manner.
              </p>

              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <div className="bg-cream-50 p-6 rounded-xl border border-cream-200">
                  <h3 className="font-serif text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-cream-900 text-white rounded-full flex items-center justify-center text-sm">
                      V
                    </span>{" "}
                    Vision
                  </h3>
                  <p className="text-sm">
                    To make Affordable, Stylish, and Premium Quality Printing
                    easily accessible to every individual and every business.
                  </p>
                </div>
                <div className="bg-cream-50 p-6 rounded-xl border border-cream-200">
                  <h3 className="font-serif text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-cream-900 text-white rounded-full flex items-center justify-center text-sm">
                      M
                    </span>{" "}
                    Mission
                  </h3>
                  <ul className="text-sm space-y-2 list-disc list-inside">
                    <li>
                      To make Modern Printing easy and accessible to everyone.
                    </li>
                    <li>
                      To provide smart solutions with Quick Delivery + High
                      Quality.
                    </li>
                    <li>
                      To make better options available according to every
                      budget.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;