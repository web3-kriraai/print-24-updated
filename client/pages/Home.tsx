import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useInactivitySlider } from "../hooks/useInactivitySlider";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Star,
  Filter,
  X,
  Edit3,
} from "lucide-react";
import toast from "react-hot-toast";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import ServicesMorph from "../components/ServicesMorph";
import ServiceBanner from "../components/ServiceBanner";
import ServiceProducts from "../components/ServiceProducts";
import CustomerReviews from "../components/CustomerReviews";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import { fetchServices } from "../lib/serviceApi";
import type { Service } from "../types/serviceTypes";

interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  type?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Icon mapping based on category names






// Hero Slider Images
const heroSlides = [
  {
    id: 1,
    image: "/banner.jpg",
    alt: "Prints 24 Banner",
  },
];

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  userName: string;
  rating: number;
  comment: string;
  service?: {
    _id: string;
    name: string;
    color: string;
  };
  displayOrder: number;
  isVisible: boolean;
  isFeatured: boolean;
  placement: 'global' | 'service-specific' | 'both';
  createdAt: string;
  updatedAt: string;
}

const Home: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string>("newest");
  const [showMoreReviews, setShowMoreReviews] = useState(false);
  const [viewAllReviews, setViewAllReviews] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );
  // Dynamic services state
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [aboutData, setAboutData] = useState<any>(null);

  // Client-only flag for SSR hydration safety
  const isClient = useClientOnly();

  // Auto-rotate slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Check if user is logged in (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // Load initial data
  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);

    // Fetch About
    const fetchAbout = async () => {
      try {
        const response = await fetch(`${API_BASE_URL_WITH_API}/about`);
        if (response.ok) {
          const data = await response.json();
          setAboutData(data);
        }
      } catch (error) {
        console.error("Error fetching about data:", error);
      }
    };
    fetchAbout();

    // Fetch Services
    const fetchServicesList = async () => {
      try {
        const response = await fetch(`${API_BASE_URL_WITH_API}/services`);
        if (response.ok) {
          const data = await response.json();
          setServices(data);
          if (data.length > 0) {
            setSelectedService(data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        toast.error("Failed to load services");
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServicesList();

    // Fetch Reviews
    const fetchReviewsList = async () => {
      try {
        setLoadingReviews(true);
        const response = await fetch(`${API_BASE_URL_WITH_API}/reviews`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviewsList();

  }, []);

  const filteredReviews = reviews.filter((review) => {
    if (filterRating && review.rating !== filterRating) {
      return false;
    }
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (filterDate === "newest") {
      return dateB - dateA;
    } else if (filterDate === "oldest") {
      return dateA - dateB;
    }
    return dateB - dateA;
  });

  const displayedReviews = viewAllReviews
    ? sortedReviews
    : showMoreReviews
      ? sortedReviews
      : sortedReviews.slice(0, 6);

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  // Handler to convert serviceId to Service object
  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s._id === serviceId);
    if (service) {
      setSelectedService(service);
    }
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Morphing Services Section */}
      {!loadingServices && services.length > 0 && (
        <>
          <ServicesMorph
            services={services}
            onServiceSelect={handleServiceSelect}
          />

          {/* Service Banner */}
          {selectedService && (
            <ServiceBanner key={selectedService._id} service={selectedService} />
          )}

          {/* Dynamic Service Products Section */}
          {selectedService && (
            <ServiceProducts service={selectedService} />
          )}
        </>
      )}

      {/* Loading State */}
      {loadingServices && (
        <div className="w-full bg-white py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Existing Services Grid */}


      {/* Reviews Section - Modern Design */}
      <CustomerReviews reviews={reviews} limit={9} />


      {/* About Section - Dynamic & Animated */}
      <section className="pt-16 pb-24 relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          />
          <motion.div
            animate={{
              y: [0, 20, 0],
              x: [0, -10, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-md p-10 md:p-16 rounded-3xl shadow-xl border border-white/50"
            >
              <div className="text-center mb-12">
                <motion.h2
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="font-serif text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4"
                >
                  {aboutData?.title || "About Prints24"}
                </motion.h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
              </div>

              <div className="space-y-8 text-slate-700 leading-relaxed text-lg">
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {aboutData?.description || "Prints24 is a modern, fast-growing Digital & Offset Printing Company, whose aim is to provide Fast, Creative, and High-Quality printing solutions to customers."}
                </motion.p>

                <div className="grid md:grid-cols-2 gap-8 mt-12">
                  <motion.div
                    whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                    className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100 shadow-sm"
                  >
                    <h3 className="font-serif text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                      <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center text-lg font-bold">
                        {aboutData?.vision?.icon || "V"}
                      </span>
                      {aboutData?.vision?.title || "Vision"}
                    </h3>
                    <p className="text-slate-600 leading-relaxed group-hover:text-slate-800 transition-colors">
                      {aboutData?.vision?.description || "To make Affordable, Stylish, and Premium Quality Printing easily accessible to every individual and every business."}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                    className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl border border-purple-100 shadow-sm"
                  >
                    <h3 className="font-serif text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                      <span className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg flex items-center justify-center text-lg font-bold">
                        {aboutData?.mission?.icon || "M"}
                      </span>
                      {aboutData?.mission?.title || "Mission"}
                    </h3>
                    <ul className="text-slate-600 space-y-3">
                      {(aboutData?.mission?.items || [
                        "To make Modern Printing easy and accessible to everyone.",
                        "To provide smart solutions with Quick Delivery + High Quality.",
                        "To make better options available according to every budget."
                      ]).map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Upload Teaser Section */}
      < section className="pt-24 pb-8 bg-cream-900 text-cream-50 text-center" >
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
      </section >
    </div >
  );
};

export default Home;
