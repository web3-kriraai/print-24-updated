import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Printer, 
  Package, 
  Palette, 
  Building, 
  Sparkles, 
  TrendingUp 
} from 'lucide-react'

const Services = () => {
  const navigate = useNavigate()

  const services = [
    {
      title: 'Digital Print',
      icon: <Printer className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20',
      border: 'border-blue-200/50',
      categories: 6
    },
    {
      title: 'Bulk Print',
      icon: <Package className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-emerald-400/20 to-green-400/20',
      border: 'border-emerald-200/50',
      categories: 9
    },
    {
      title: 'Design',
      icon: <Palette className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-purple-400/20 to-pink-400/20',
      border: 'border-purple-200/50',
      categories: 4
    },
    {
      title: 'Corporate',
      icon: <Building className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-orange-400/20 to-red-400/20',
      border: 'border-orange-200/50',
      categories: 4
    },
    {
      title: 'Finishes',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-yellow-400/20 to-amber-400/20',
      border: 'border-yellow-200/50',
      categories: 4
    },
    {
      title: 'Tracking',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-indigo-400/20 to-blue-400/20',
      border: 'border-indigo-200/50',
      categories: 4
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white/50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Minimal Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-light text-gray-800 mb-2">
            Our <span className="font-semibold text-blue-500">Services</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Premium printing solutions with transparent workflows
          </p>
        </motion.div>

        {/* Minimal Glassy Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => navigate('/products', { state: { selectedType: service.title } })}
              className={`
                relative p-5 rounded-2xl cursor-pointer
                ${service.color} ${service.border} border
                backdrop-blur-sm bg-white/30
                shadow-[0_8px_32px_rgba(31,38,135,0.07)]
                hover:shadow-[0_8px_32px_rgba(31,38,135,0.12)]
                transition-all duration-300
                overflow-hidden
                group
              `}
            >
              {/* Glassy Overlay Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Minimal Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`
                    p-2 rounded-xl
                    ${service.border} border
                    bg-white/40 backdrop-blur-sm
                    shadow-sm
                  `}>
                    {service.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                    {service.categories} cats
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {service.title}
                </h3>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500">
                    Click to explore
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white/70 transition-colors">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Minimal Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Auto-redirect', value: '1s' },
              { label: 'Categories', value: '15+' },
              { label: 'Tracking', value: '5 Stage' },
              { label: 'Panels', value: '4 Types' }
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-xl bg-white/30 backdrop-blur-sm border border-gray-200/30 text-center"
              >
                <div className="text-lg font-semibold text-gray-800">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Minimal CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => navigate('/products')}
            className="
              px-6 py-2 
              bg-gradient-to-r from-blue-500/10 to-cyan-500/10
              backdrop-blur-sm
              border border-blue-300/30
              text-blue-600 
              text-sm font-medium
              rounded-xl
              hover:from-blue-500/20 hover:to-cyan-500/20
              hover:border-blue-400/50
              transition-all duration-300
              shadow-sm hover:shadow
            "
          >
            View All Products →
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default Services