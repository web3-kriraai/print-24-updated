import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Services from '../components/Services'
import Products from '../components/Products'

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero Section with Background Image */}
      <div 
        className="relative min-h-[90vh] flex items-center pt-20"
        style={{
          backgroundImage: 'url(/images/banner.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-linear-to-r from-black/40 via-black/20 to-transparent"></div>
        {/* Content Container */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content Block */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-white"
            >
              {/* Badge/Tag */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-block mb-6"
              >
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                  Premium Printing Services
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Unleash Your Creativity with{' '}
                <span className="text-yellow-400">Premium Prints</span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-lg sm:text-xl text-white/90 mb-8 leading-relaxed max-w-xl"
              >
                Stand out from the crowd with our exquisite printing services that add a touch of elegance and professionalism to your brand.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/digital-print"
                  className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Explore Now
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold rounded-lg border-2 border-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  Contact Us
                </Link>
              </motion.div>

              {/* Stats or Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mt-12 flex flex-wrap gap-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-sm text-white/80">Quality Guaranteed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Fast</p>
                    <p className="text-sm text-white/80">Delivery</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Best</p>
                    <p className="text-sm text-white/80">Pricing</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Side - Floating Product Showcase */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden lg:block relative h-[600px]"
            >
              {/* Floating Cards/Products */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-20 left-10 w-48 h-64 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 transform rotate-[-5deg]"
              >
                <div className="p-4 h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-40 bg-linear-to-br from-purple-400 to-purple-600 rounded-lg mx-auto mb-4 shadow-lg"></div>
                    <p className="text-sm font-semibold">Premium Cards</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{
                  y: [0, 20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute top-40 right-10 w-48 h-64 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 transform rotate-[5deg]"
              >
                <div className="p-4 h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-40 bg-linear-to-br from-yellow-400 to-orange-500 rounded-lg mx-auto mb-4 shadow-lg"></div>
                    <p className="text-sm font-semibold">Business Cards</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
                className="absolute bottom-20 left-20 w-48 h-64 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 transform rotate-3"
              >
                <div className="p-4 h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-32 h-40 bg-linear-to-br from-blue-400 to-blue-600 rounded-lg mx-auto mb-4 shadow-lg"></div>
                    <p className="text-sm font-semibold">Custom Prints</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <Services />
    </div>
  )
}

export default Home
