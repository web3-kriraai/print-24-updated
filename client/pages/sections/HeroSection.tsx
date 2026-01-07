// sections/HeroSection.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Compass } from "lucide-react";

const heroSlides = [
  {
    id: 1,
    image: "/banner.jpg",
    alt: "Prints 24 Banner",
  },
];

const HeroSection: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative mt-2 mr-4 sm:mt-4 md:mt-6 h-[70vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh] xl:h-[65vh] min-h-[420px] sm:min-h-[380px] md:min-h-[400px] lg:min-h-[450px] xl:min-h-[500px] max-h-[750px] sm:max-h-[600px] md:max-h-[650px] lg:max-h-[700px] xl:max-h-[750px] w-full overflow-hidden bg-cream-900 rounded-xl sm:rounded-2xl md:rounded-3xl mx-2 sm:mx-4 md:mx-6 lg:mx-8">
      {/* Background Image Slider */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            src={heroSlides[currentSlide].image}
            alt={heroSlides[currentSlide].alt}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/60 backdrop-blur-[1px] sm:backdrop-blur-[2px]"></div>
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full"
        >
          {/* Welcome Text */}
          <div className="inline-block py-2 px-4 sm:py-2.5 sm:px-6 md:py-3 md:px-8 lg:py-4 lg:px-10 rounded-full bg-cream-50/95 backdrop-blur-sm sm:backdrop-blur-md border border-white/20 mb-4 sm:mb-6 md:mb-8 lg:mb-10">
            <span className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-gray-800 uppercase tracking-wider">
              WELCOME TO PRINTS 24
            </span>
          </div>

          {/* Premium Printing Text */}
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-5 md:mb-6 lg:mb-8 leading-tight drop-shadow-lg px-2 sm:px-4">
            Premium Printing <br className="hidden sm:block" />
            <span className="text-cream-300 italic">Simplified</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-cream-100 mb-6 sm:mb-8 md:mb-10 lg:mb-12 max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto leading-relaxed drop-shadow-md px-2 sm:px-4">
            India's easiest and fastest printing platform. Design your
            personality and receive premium prints delivered right to your
            desk.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 px-4 sm:px-6 md:px-8">
            <Link
              to="/signup"
              className="bg-cream-50 text-cream-900 px-5 py-2.5 sm:px-6 sm:py-3 md:px-7 md:py-3.5 lg:px-8 lg:py-4 rounded-full text-sm sm:text-base md:text-lg lg:text-xl font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px]"
            >
              <UserPlus size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" /> 
              <span>Sign Up Now</span>
            </Link>
            <Link
              to="/digital-print"
              className="bg-cream-50 text-cream-900 px-5 py-2.5 sm:px-6 sm:py-3 md:px-7 md:py-3.5 lg:px-8 lg:py-4 rounded-full text-sm sm:text-base md:text-lg lg:text-xl font-bold hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px]"
            >
              <Compass size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" /> 
              <span>Explore Products</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;