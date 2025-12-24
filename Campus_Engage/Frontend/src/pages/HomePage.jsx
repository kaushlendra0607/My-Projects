import React, { useEffect, useState, useCallback } from 'react';
import api from '../config/api.js';
import { toast } from 'react-toastify';
import { EVENT_CATEGORIES, EVENT_STATUS } from '../constants.js';
import styles from "./home.module.css";
import { Link } from 'react-router';
// import { debounce } from 'lodash'; // Optional: for smoother searching

const HomePage = () => {

  // --- STATE ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // The Master Filter State
  const [filters, setFilters] = useState({
    query: "",        // Search text
    category: "",     // Empty string = All categories
    status: "UPCOMING", // Default to Upcoming
    page: 1,
    limit: 10
  });

  // --- API CALL ---
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Build the Query String dynamically
      // We use URLSearchParams to handle escaping automatically
      const params = new URLSearchParams();

      if (filters.query) params.append("query", filters.query);
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      params.append("page", filters.page);
      params.append("limit", filters.limit);

      // 2. Hit the Backend
      // URL becomes: /events?status=UPCOMING&category=TECH&page=1...
      const response = await api.get(`/api/event?${params.toString()}`);

      if (response.data?.data) {
        setEvents(response.data.data.events || []);
        console.log(response.data.data.events);
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not fetch events");
    } finally {
      setLoading(false);
    }
  }, [filters]); // 👈 Re-run whenever 'filters' change

  // --- EFFECT ---
  useEffect(() => {
    // Optional: Add a debounce here if search causes too many requests
    const timer = setTimeout(() => {
      fetchEvents();
    }, 2000); // delay to wait for user to stop typing

    return () => clearTimeout(timer);
  }, [fetchEvents]);


  // --- HANDLERS ---
  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, query: e.target.value, page: 1 }));
  };

  const handleCategoryChange = (cat) => {
    // If clicking the same category, toggle it off (reset to all)
    setFilters(prev => ({
      ...prev,
      category: prev.category === cat ? "" : cat,
      page: 1
    }));
  };

  const handleStatusChange = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }));
  };

  return (
    <main className={styles.homePage}>

      {/* --- CONTROL PANEL (Search & Filters) --- */}
      <div className={styles.controlPanel}>
        <h1 className={styles.panelHead}>Explore Events</h1>

        <div className={styles.searchStatus}>

          {/* 1. Search Bar */}
          <div className={styles.search}>
            <input
              type="text"
              placeholder="Search events..."
              value={filters.query}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 2. Status Dropdown */}
          <div className={styles.statusDrop}>
            <span className={styles.show}>Show:</span>
            <select
              value={filters.status}
              onChange={handleStatusChange}
              className={styles.status}
            >
              <option value="ALL" className={styles.dropText}>All Events</option>
              {EVENT_STATUS.map(status => (
                <option className={styles.dropText} key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Category Pills */}
        <div className={styles.category}>
          <button
            onClick={() => handleCategoryChange("")}
            className={filters.category === "" ? styles.activeCat : styles.inActiveCat}
          >
            All
          </button>
          {EVENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={filters.category === cat ? styles.activeCat : styles.inActiveCat}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* --- EVENTS GRID --- */}
      {loading ? (
        <div className={styles.load}>Loading events...</div>
      ) : events.length === 0 ? (
        <div className={styles.noEvent}>
          <h3 className={styles.noFound}>No events found</h3>
          <p className={styles.tryAdjust}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className={styles.eventDiv}>
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
      {/* --- PAGINATION CONTROLS --- */}
      {events.length > 0 && (
        <div className={styles.pagination}>
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            className={styles.pageBtn}
          >
            ← Previous
          </button>

          <span className={styles.pageInfo}>
            Page {filters.page}
          </span>

          <button
            // You might need 'totalPages' from backend response to disable this correctly
            // For now, simple logic: if we got less than 'limit', we are at the end.
            disabled={events.length < filters.limit}
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            className={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
};

// Simple Sub-component for cleanliness
const EventCard = ({ event }) => (
  <div className={styles.eventCard}>
    <div className={styles.cover}>
      <img
        src={event.coverImage || "https://via.placeholder.com/400x200"}
        alt={event.eventName}
        className={styles.image}
      />
      <div className={styles.cardCat}>
        {event.eventCategory}
      </div>
    </div>
    <div className={styles.details}>
      <h3 className={styles.title}>{event.eventName}</h3>
      <p className={styles.eventDate}>Starting: {new Date(event.eventStartDateTime).toDateString()}</p>
      <div className={styles.feeDetails}>
        <span className={styles.fee}>
          {event.registrationFee === 0 ? "FREE" : `₹${event.registrationFee}`}
        </span>
        <Link to={`/event/${event._id}`} className={styles.view} >
          View Details →
        </Link>
      </div>
    </div>
  </div>
);

export default HomePage;