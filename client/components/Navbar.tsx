import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  User as UserIcon,
  Package,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLogo } from "../hooks/useSiteSettings";
import { useAuth } from "../context/AuthContext";



const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { user: userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { logo } = useLogo();

  useEffect(() => {
    // Mark as mounted
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".profile-dropdown")) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { label: "HOME", path: "/" },
    { label: "REVIEWS", path: "/reviews" },
    { label: "POLICY", path: "/policy" },
    { label: "ABOUT US", path: "/about" },
    // { label: "CONTACT US", path: "/contact" }, // Removed as per request
  ];

  const adminNavLinks = [
    { label: "DASHBOARD", path: "/admin/dashboard" },
    { label: "SERVICES", path: "/admin/services" },
    { label: "ABOUT", path: "/admin/about" },
  ];

  // Track if component is mounted to avoid hydration mismatch
  // Server always renders with isMounted=false, client starts false then becomes true
  // This ensures server and client initial render match
  // IMPORTANT: userData must be null on both server and client initial render
  const [isMounted, setIsMounted] = React.useState(false);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const allNavLinks = isAdminRoute ? adminNavLinks : navLinks;

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  const logoutHandler = () => {
    logout();
    setIsProfileDropdownOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Check if we're on login or signup page
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${isAdminRoute
        ? "bg-slate-900 text-white shadow-md py-2" // Admin Theme
        : isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm py-2"
          : "bg-white py-2"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 relative">
          {/* Logo - Smoothly transitions from left to center */}
          <motion.div
            initial={false}
            animate={{
              left: isAuthPage ? "50%" : "0px",
              x: isAuthPage ? "-50%" : "0%",
            }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1] // Custom easing for smooth motion
            }}
            className="flex items-center absolute"
          >
            <Link
              to="/"
              className="flex items-center gap-2 group cursor-pointer h-full"
              onClick={(e) => {
                if (isAuthPage) {
                  e.preventDefault();
                  navigate("/");
                } else if (location.pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <motion.img
                src={logo}
                alt="Prints24 Logo"
                className={`object-contain group-hover:scale-105 transition-all duration-300 cursor-pointer ${isAuthPage
                  ? "h-12 sm:h-14 md:h-16 w-auto"
                  : "h-12 w-auto sm:h-14 md:h-16"
                  }`}
                initial={false}
              />
            </Link>
          </motion.div>

          {/* Desktop Navigation - Hidden on auth pages */}
          {!isAuthPage && (
            <div className="flex-1 flex items-center justify-end">
              <div className="hidden md:flex items-center space-x-6">
                {allNavLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm font-medium transition-colors duration-200 relative group ${isAdminRoute
                      ? isActive(link.path)
                        ? "text-blue-400 font-semibold"
                        : "text-gray-300 hover:text-white"
                      : isActive(link.path)
                        ? "text-cream-800 font-semibold"
                        : "text-cream-600 hover:text-cream-900"
                      }`}
                  >
                    {link.label}
                    <span
                      className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${isAdminRoute
                        ? isActive(link.path) ? "bg-blue-400 w-full" : "bg-blue-400"
                        : isActive(link.path) ? "bg-cream-800 w-full" : "bg-cream-800"
                        }`}
                    />
                  </Link>
                ))}
              </div>

              {/* Auth / Profile - Hidden on auth pages */}
              {/* IMPORTANT: Server always renders logged-out state, client updates after mount */}
              {/* This ensures hydration match - both render !userData initially */}
              <div className="hidden md:flex items-center space-x-3 ml-8">
                {!userData || !isMounted ? (
                  <>
                    <Link to="/login">
                      <button className="bg-red-600 text-white font-medium text-base hover:bg-red-700 transition-colors px-6 py-2.5 rounded-full shadow-md">
                        Login
                      </button>
                    </Link>
                    <Link to="/signup">
                      <button className="bg-purple-600 text-white px-6 py-2.5 rounded-full text-base font-medium hover:bg-purple-700 transition-all shadow-md hover:shadow-lg">
                        Sign Up
                      </button>
                    </Link>
                  </>
                ) : (
                  <div className="relative profile-dropdown">
                    <button
                      onClick={() =>
                        setIsProfileDropdownOpen(!isProfileDropdownOpen)
                      }
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-cream-100 transition-colors" // Increased from p-1.5 to p-2
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${!userData.profileImage ? getRandomColor(userData.name) : ""} flex items-center justify-center text-white text-sm font-bold overflow-hidden bg-slate-100`}
                      >
                        {userData.profileImage ? (
                          <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(userData.name)
                        )}
                      </div>
                      <span className="text-cream-700 text-sm font-medium">
                        {userData.name.split(" ")[0]}
                      </span>
                    </button>

                    {/* Profile Dropdown */}
                    <AnimatePresence>
                      {isProfileDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-cream-200 py-2 z-50" // Increased mt-1 to mt-2
                        >
                          {/* User Info Section */}
                          <div className="px-4 py-3 border-b border-cream-100">
                            {" "}
                            {/* Increased py-2 to py-3 */}
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full ${!userData.profileImage ? getRandomColor(userData.name) : ""} flex items-center justify-center text-white font-bold overflow-hidden bg-slate-100`}
                              >
                                {userData.profileImage ? (
                                  <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(userData.name)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-cream-900 truncate">
                                  {userData.name}
                                </p>
                                <p className="text-xs text-cream-600 truncate">
                                  {userData.email}
                                </p>
                                <span className="inline-block mt-1 px-2 py-1 bg-cream-100 text-cream-700 text-xs rounded-full capitalize">
                                  {" "}
                                  {/* Increased padding */}
                                  {userData.role}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dropdown Menu Items */}
                          <div className="py-2">
                            {" "}
                            {/* Increased py-1 to py-2 */}
                            <button
                              onClick={() => {
                                navigate("/profile");
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cream-700 hover:bg-cream-50 transition-colors" // Increased py-1.5 to py-2
                            >
                              <UserIcon size={16} />
                              My Profile
                            </button>
                            {userData.role === "designer" && (
                              <button
                                onClick={() => {
                                  navigate("/designer/dashboard");
                                  setIsProfileDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cream-700 hover:bg-cream-50 transition-colors"
                              >
                                <LayoutDashboard size={16} />
                                Designer Dashboard
                              </button>
                            )}
                            {userData.role === "admin" && (
                              <button
                                onClick={() => {
                                  navigate("/admin/dashboard");
                                  setIsProfileDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cream-700 hover:bg-cream-50 transition-colors" // Increased py-1.5 to py-2
                              >
                                <Settings size={16} />
                                Admin Dashboard
                              </button>
                            )}
                            {userData.role === "emp" && (
                              <button
                                onClick={() => {
                                  navigate("/employee/dashboard");
                                  setIsProfileDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cream-700 hover:bg-cream-50 transition-colors"
                              >
                                <Package size={16} />
                                Employee Dashboard
                              </button>
                            )}
                          </div>

                          {/* Logout Button */}
                          <div className="border-t border-cream-100 pt-2">
                            {" "}
                            {/* Increased pt-1 to pt-2 */}
                            <button
                              onClick={logoutHandler}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors" // Increased py-1.5 to py-2
                            >
                              <LogOut size={16} />
                              Logout
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Menu Toggle - Hidden on auth pages */}
          {!isAuthPage && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-cream-900 focus:outline-none p-1"
              >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}{" "}
                {/* Increased from 24 to 28 */}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu - Hidden on auth pages */}
      {!isAuthPage && (
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-cream-50 border-t border-cream-200"
            >
              <div className="px-4 pt-2 pb-4 space-y-2">
                {" "}
                {/* Increased padding */}
                {allNavLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${isActive(link.path)
                      ? "bg-cream-100 text-cream-900"
                      : "text-cream-600 hover:bg-cream-100 hover:text-cream-900"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 pt-4 border-t border-cream-200 flex flex-col space-y-3">
                  {" "}
                  {/* Increased spacing */}
                  {/* IMPORTANT: Server always renders logged-out state, client updates after mount */}
                  {!userData || !isMounted ? (
                    <>
                      <button
                        onClick={() => {
                          navigate("/login");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-red-600 text-white font-medium text-base py-3 rounded-full shadow-md"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => {
                          navigate("/signup");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-purple-600 text-white py-3 rounded-full font-medium text-base shadow-md"
                      >
                        Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Mobile User Info */}
                      <div className="px-3 py-2 bg-cream-100 rounded-lg">
                        {" "}
                        {/* Increased padding */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${!userData.profileImage ? getRandomColor(userData.name) : ""} flex items-center justify-center text-white text-sm font-bold overflow-hidden bg-slate-100`}
                          >
                            {userData.profileImage ? (
                              <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(userData.name)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-cream-900">
                              {userData.name}
                            </p>
                            <p className="text-xs text-cream-600">
                              {userData.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          navigate("/profile");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-center text-cream-900 font-medium py-2 flex items-center justify-center gap-2" // Increased padding
                      >
                        <UserIcon size={16} />
                        My Profile
                      </button>

                      {userData.role === "admin" && (
                        <button
                          onClick={() => {
                            navigate("/admin/dashboard");
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full text-center text-cream-900 font-medium py-2 flex items-center justify-center gap-2" // Increased padding
                        >
                          <Settings size={16} />
                          Admin Dashboard
                        </button>
                      )}

                      <button
                        onClick={() => {
                          logoutHandler();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2" // Increased padding
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </nav>
  );
};

export default Navbar;
