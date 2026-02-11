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
import FeaturesSection from "../components/FeaturesSection";
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
        const data = await fetchServices();
        // Filter visible services and sort
        const visibleServices = data
          .filter((s: Service) => s.isActive !== false)
          .sort((a: Service, b: Service) => (a.sortOrder || 0) - (b.sortOrder || 0));

        setServices(visibleServices);
        if (visibleServices.length > 0) {
          setSelectedService(visibleServices[0]);
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
            selectedServiceId={selectedService?._id}
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
      <CustomerReviews reviews={reviews} />

      {/* Features Section */}
      <FeaturesSection />


    </div >
  );
};

export default Home;
