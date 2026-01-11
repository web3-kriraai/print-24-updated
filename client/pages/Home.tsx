// Home.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HeroSection from "./sections/HeroSection";
import ServicesSection from "./sections/ServicesSection";
import CategoriesSlider from "./components/CategoriesSlider";
import ReviewsSection from "./sections/ReviewsSection";
import AboutSection from "./sections/AboutSection";
import UploadSection from "./sections/UploadSection";
import { useClientOnly } from "../hooks/useClientOnly";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";

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
  createdAt: string;
  updatedAt: string;
}

const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isClient = useClientOnly();

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const BASE_URL = API_BASE_URL_WITH_API;
        const headers = { Accept: "application/json" };

        // Fetch Digital Categories
        const digitalResponse = await fetch(`${BASE_URL}/categories/digital`, {
          method: "GET",
          headers,
        });

        const digitalText = await digitalResponse.text();
        if (!digitalResponse.ok) {
          throw new Error(`HTTP ${digitalResponse.status}`);
        }
        const digitalData = JSON.parse(digitalText);

        // Fetch Bulk Categories
        const bulkResponse = await fetch(`${BASE_URL}/categories/bulk`, {
          method: "GET",
          headers,
        });

        const bulkText = await bulkResponse.text();
        if (!bulkResponse.ok) {
          throw new Error(`HTTP ${bulkResponse.status}`);
        }
        const bulkData = JSON.parse(bulkText);

        // Process categories
        const digitalCategories = digitalData.map((cat: Category) => ({
          ...cat,
          type: "digital",
        }));
        const bulkCategories = bulkData.map((cat: Category) => ({
          ...cat,
          type: "bulk",
        }));

        digitalCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        bulkCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        setCategories([...digitalCategories, ...bulkCategories]);
      } catch (err) {
        console.error("Fetch categories error:", err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Check if user is logged in
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const BASE_URL = API_BASE_URL_WITH_API;
        const headers = { Accept: "application/json" };

        const response = await fetch(`${BASE_URL}/reviews`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setReviews(data);
      } catch (err) {
        console.error("Fetch reviews error:", err);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, []);

  return (
    <div className="w-full mt-5 overflow-hidden pr-4">
      <HeroSection />
      
      <ServicesSection 
        categories={categories}
        loadingCategories={loadingCategories}
      >
        <CategoriesSlider 
          categories={categories}
          loadingCategories={loadingCategories}
        />
      </ServicesSection>
      
      <ReviewsSection 
        reviews={reviews}
        loadingReviews={loadingReviews}
        isLoggedIn={isLoggedIn}
        isClient={isClient}
      />
      <AboutSection />
      <UploadSection />
    </div>
  );
};

export default Home;