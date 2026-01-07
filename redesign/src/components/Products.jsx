import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'

const Products = () => {
  const [activeType, setActiveType] = useState('Digital Print')
  const [autoSlide, setAutoSlide] = useState(true)
  
  const productTypes = [
    {
      id: 'digital',
      title: 'Digital Print',
      icon: '🖨️',
      gradient: 'from-blue-500/10 to-cyan-500/10',
      categories: [
        'Visiting Card', 'Card Holder', 'Pens',
        'Letter Head', 'Mug', 'Key Chain'
      ]
    },
    {
      id: 'bulk',
      title: 'Bulk Print',
      icon: '📦',
      gradient: 'from-emerald-500/10 to-green-500/10',
      categories: [
        'Visiting Card', 'Pamphlet / Posters', 'Garments Tags',
        'Dr. Files', 'Letter Heads', 'Envelopes',
        'ATM Pouches', 'Bill Books', 'Stickers & Labels'
      ]
    }
  ]

  const currentType = productTypes.find(type => type.title === activeType)

  // Auto-switch between product types every 24 seconds
  useEffect(() => {
    if (!autoSlide) return
    
    const interval = setInterval(() => {
      setActiveType(prev => 
        prev === 'Digital Print' ? 'Bulk Print' : 'Digital Print'
      )
    }, 24000) // 24 seconds

    return () => clearInterval(interval)
  }, [autoSlide])

  // Stop auto-slide on interaction
  const handleInteraction = () => {
    setAutoSlide(false)
    setTimeout(() => setAutoSlide(true), 30000) // Resume after 30 seconds
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50/50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Minimal Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-600 font-medium">Premium Printing</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-3xl font-light text-gray-800 mb-2">
            Our <span className="font-semibold text-gray-900">Products</span>
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Select your printing type to explore categories
          </p>
        </motion.div>

        {/* Type Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-2 mb-8"
        >
          {productTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setActiveType(type.title)
                handleInteraction()
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                ${activeType === type.title 
                  ? 'bg-white shadow-md border border-gray-200 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }
              `}
            >
              <span className="mr-2">{type.icon}</span>
              {type.title}
            </button>
          ))}
        </motion.div>

        {/* Auto-slide Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs text-gray-500">
              Auto-switch in {activeType === 'Digital Print' ? '24s' : '24s'}
            </span>
          </div>
        </div>

        {/* Products Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Glassy Container */}
            <div className={`
              rounded-2xl backdrop-blur-sm bg-white/30
              border border-gray-200/50 shadow-[0_8px_32px_rgba(31,38,135,0.05)]
              p-6
            `}>
              {/* Type Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-1">
                      {currentType.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {currentType.categories.length} categories available
                    </p>
                  </div>
                  <div className={`
                    p-2 rounded-xl
                    bg-gradient-to-br ${currentType.gradient}
                    border border-gray-200/30
                  `}>
                    <span className="text-xl">{currentType.icon}</span>
                  </div>
                </div>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {currentType.categories.map((category, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    onClick={handleInteraction}
                    className={`
                      group cursor-pointer p-4 rounded-xl
                      bg-white/50 backdrop-blur-sm
                      border border-gray-200/50
                      hover:bg-white/80 hover:border-gray-300/50
                      transition-all duration-300
                      flex flex-col items-center justify-center
                      text-center
                    `}
                  >
                    {/* Circular Icon */}
                    <div className={`
                      w-12 h-12 rounded-full mb-3
                      flex items-center justify-center
                      bg-gradient-to-br ${currentType.gradient.replace('/10', '/20')}
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      <span className="text-lg">
                        {category === 'Visiting Card' && '👤'}
                        {category === 'Card Holder' && '💼'}
                        {category === 'Pens' && '✏️'}
                        {category === 'Letter Head' && '📝'}
                        {category === 'Mug' && '☕'}
                        {category === 'Key Chain' && '🔑'}
                        {category === 'Pamphlet / Posters' && '📰'}
                        {category === 'Garments Tags' && '👕'}
                        {category === 'Dr. Files' && '📁'}
                        {category === 'Letter Heads' && '📄'}
                        {category === 'Envelopes' && '✉️'}
                        {category === 'ATM Pouches' && '💳'}
                        {category === 'Bill Books' && '📒'}
                        {category === 'Stickers & Labels' && '🏷️'}
                      </span>
                    </div>
                    
                    <span className="text-sm font-medium text-gray-700 line-clamp-2">
                      {category}
                    </span>
                    
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>

              {/* UI Rules Info */}
              <div className="mt-6 pt-6 border-t border-gray-200/50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      Desktop: 6-9 per row
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      Mobile: 2-3 per row
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                    Auto-swipe enabled
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="h-1 bg-gray-200/50 rounded-full overflow-hidden">
                <motion.div
                  key={activeType}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 24, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Minimal Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-3 gap-3 max-w-md mx-auto"
        >
          {[
            { label: 'Main Types', value: '2' },
            { label: 'Categories', value: '15+' },
            { label: 'Auto Switch', value: '24s' }
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="p-3 rounded-xl bg-white/30 backdrop-blur-sm border border-gray-200/30 text-center"
            >
              <div className="text-lg font-semibold text-gray-800">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default Products