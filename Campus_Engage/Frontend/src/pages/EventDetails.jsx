import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/api';
import { toast } from 'react-toastify';
import styles from './EventDetails.module.css'; // We will create this next
import { useAuth } from '../context/AuthContext.jsx'; // Assuming you have auth context

const EventDetails = () => {
    const { id } = useParams(); // Get event ID from URL
    const navigate = useNavigate();
    const { user } = useAuth(); // Get current user

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false); // Check if user already registered

    // --- FETCH EVENT DATA ---
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await api.get(`/api/event/${id}`);
                // Assuming response.data.data returns the event object
                setEvent(response.data.data);

                // Check if current user is in the registration list (if your API returns it)
                // OR you might need a separate endpoint to check status. 
                // For now, let's assume the button logic handles the action.
            } catch (error) {
                toast.error("Could not fetch event details");
                console.error(error);
                navigate('/'); // Go back home on error
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id, navigate]);

    // --- HANDLE REGISTRATION ---
    const handleRegister = async () => {
        try {
            setRegistering(true);
            // Call your register endpoint
            const response = await api.post(`/api/event/register/${id}`);

            if (response.status === 200 || response.status === 201) {
                toast.success("Successfully Registered!");
                setIsRegistered(true);
                // Refresh data to update participant count
                setEvent(prev => ({ ...prev, participantsCount: prev.participantsCount + 1 }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setRegistering(false);
        }
    };

    if (loading) return <div className={styles.loader}>Loading Event...</div>;
    if (!event) return null;

    // --- DERIVED STATE FOR BUTTONS ---
    const now = new Date();
    const regOpen = new Date(event.registrationOpenDate);
    const regClose = new Date(event.registrationCloseDate);

    const isRegistrationOpen = now >= regOpen && now <= regClose;
    const isFull = event.maxParticipants > 0 && event.participantsCount >= event.maxParticipants;
    const isCreator = user.role === "ADMIN" || user.role === "CHIEF";

    return (
        <div className={styles.container}>

            {/* 1. HERO SECTION */}
            <div className={styles.hero}>
                <img
                    src={event.coverImage || "https://via.placeholder.com/800x400"}
                    alt={event.eventName}
                    className={styles.coverImage}
                />
                <div className={styles.overlay}>
                    <span className={styles.categoryBadge}>{event.eventCategory}</span>
                    <h1 className={styles.title}>{event.eventName}</h1>
                </div>
            </div>

            <div className={styles.contentGrid}>

                {/* 2. LEFT COLUMN: DETAILS */}
                <div className={styles.leftCol}>
                    <div className={styles.section}>
                        <h3>About this Event</h3>
                        <p className={styles.description}>{event.description}</p>
                    </div>

                    <div className={styles.section}>
                        <h3>Cancellation Policy</h3>
                        <p className={styles.policy}>
                            {event.canUserCancel
                                ? "✅ Cancellations are allowed for this event."
                                : "❌ This event is non-refundable / cannot be cancelled."}
                        </p>
                    </div>

                    {/* ADMIN ONLY BUTTONS */}
                    {isCreator && (
                        <div className={styles.adminControls}>
                            <button className={styles.editBtn}>Edit Event</button>
                            <button className={styles.deleteBtn}>Delete Event</button>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT COLUMN: ACTION CARD */}
                <div className={styles.rightCol}>
                    <div className={styles.actionCard}>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Date</span>
                            <span className={styles.value}>
                                {new Date(event.eventStartDateTime).toLocaleDateString()}
                            </span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Time</span>
                            <span className={styles.value}>
                                {new Date(event.eventStartDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Venue</span>
                            <span className={styles.value}>{event.venue}</span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Price</span>
                            <span className={styles.price}>
                                {event.registrationFee === 0 ? "FREE" : `₹${event.registrationFee}`}
                            </span>
                        </div>

                        {/* CAPACITY BAR */}
                        {event.maxParticipants > 0 && (
                            <div className={styles.capacity}>
                                <div className={styles.capacityText}>
                                    <span>Capacity</span>
                                    <span>{event.participantsCount} / {event.maxParticipants}</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${(event.participantsCount / event.maxParticipants) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {/* THE BIG REGISTER BUTTON */}
                        <button
                            className={styles.registerBtn}
                            onClick={handleRegister}
                            disabled={!isRegistrationOpen || isFull || registering || isRegistered}
                        >
                            {registering ? "Processing..." :
                                isRegistered ? "Already Registered" :
                                    isFull ? "Sold Out" :
                                        !isRegistrationOpen ? "Registration Closed" :
                                            "Register Now"}
                        </button>

                        <p className={styles.regNote}>
                            Registration closes on {regClose.toLocaleDateString()}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EventDetails;