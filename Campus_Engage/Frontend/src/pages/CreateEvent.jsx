import React, { useState } from 'react';
import styles from "./create_event.module.css";
import { EVENT_CATEGORIES } from '../constants.js';
import { toast } from 'react-toastify';
import api from '../config/api.js';

const CreateEvent = () => {

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState(''); // Default empty

  // Use datetime-local inputs for precise timing
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [regStart, setRegStart] = useState('');
  const [regEnd, setRegEnd] = useState('');

  const [fee, setFee] = useState(0);
  const [maxPart, setMaxPart] = useState(0);
  const [canCancel, setCanCancel] = useState(true);
  const [cover, setCover] = useState(null);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!category) {
      return toast.error("Please select an event category");
    }

    try {
      const formData = new FormData();
      formData.append("eventName", name);
      formData.append("description", description);
      formData.append("venue", venue);
      formData.append("eventCategory", category);
      formData.append("eventStartDateTime", start);
      formData.append("eventEndDateTime", end);
      formData.append("registrationOpenDate", regStart);
      formData.append("registrationCloseDate", regEnd);
      formData.append("registrationFee", fee);
      formData.append("maxParticipants", maxPart);
      // FormData sends booleans as strings "true"/"false"
      formData.append("canUserCancel", canCancel);

      if (cover) {
        formData.append("coverImage", cover);
      }

      const response = await api.post('/api/event/create-event', formData, {
        headers: { "Content-Type": "multipart/form-data" } // Good practice to be explicit
      });

      if (response?.data?.statusCode === 201 || response?.status === 201) {
        toast.success(response?.data?.message || "Event Created Successfully!");
        // Optional: Reset form or Redirect
        // navigate('/events');
        // --- RESET ALL STATES MANUALLY ---
        setName('');
        setDescription('');
        setVenue('');
        setCategory('');
        setStart('');
        setEnd('');
        setRegStart('');
        setRegEnd('');
        setFee(0);
        setMaxPart(0);
        setCanCancel(false);
        setCover(null);

        // --- RESET FILE INPUT VISUALLY ---
        // State clears the data, but the HTML input might still show the filename.
        // This forces the file input to clear:
        document.getElementById('cover').value = "";
      } else {
        toast.error(response?.data?.message || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create event");
    }
  }

  return (
    <section className={styles.container}> {/* Added a container class for padding */}
      <h1 className={styles.heading}>Host an Event</h1>

      <form onSubmit={onSubmitHandler} className={styles.form}>

        {/* --- 1. BASIC DETAILS --- */}
        <label htmlFor="title" className={styles.label}>Event Name:</label>
        <input type="text" required value={name}
          placeholder='e.g., Tech Expo 2026'
          onChange={(e) => setName(e.target.value)}
          id='title' className={styles.input} />

        <label htmlFor="description" className={styles.label}>Description:</label>
        <textarea required value={description} // Changed to textarea for better UX
          placeholder='Describe your event...'
          onChange={(e) => setDescription(e.target.value)}
          id='description' className={styles.textarea}
          rows={4}
        />

        <label htmlFor="venue" className={styles.label}>Venue:</label>
        <input type="text" required value={venue}
          placeholder='e.g., Auditorium Hall A'
          onChange={(e) => setVenue(e.target.value)}
          id='venue' className={styles.input} />

        <label htmlFor="cover" className={styles.label}>Cover Image:</label>
        <input type="file" required
          onChange={(e) => setCover(e.target.files[0])}
          id='cover' className={styles.fileInput} />

        {/* --- 2. CATEGORY (Fixed) --- */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Category:</label>
          <select
            className={styles.selectInput}
            onChange={(e) => setCategory(e.target.value)}
            value={category}
            required
          >
            {/* ✅ FIX: Add default disabled option */}
            <option value="" disabled>Select a Category</option>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* --- 3. TIMINGS (Fixed to datetime-local) --- */}
        <div className={styles.row}>
          <div className={styles.col}>
            <label htmlFor="start" className={styles.label}>Event Start:</label>
            <input type="datetime-local" required value={start}
              onChange={(e) => setStart(e.target.value)}
              id='start' className={styles.input} />
          </div>
          <div className={styles.col}>
            <label htmlFor="end" className={styles.label}>Event End:</label>
            <input type="datetime-local" required value={end}
              onChange={(e) => setEnd(e.target.value)}
              id='end' className={styles.input} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.col}>
            <label htmlFor="regStart" className={styles.label}>Reg. Start:</label>
            <input type="datetime-local" required value={regStart}
              onChange={(e) => setRegStart(e.target.value)}
              id='regStart' className={styles.input} />
          </div>
          <div className={styles.col}>
            <label htmlFor="regEnd" className={styles.label}>Reg. End:</label>
            <input type="datetime-local" required value={regEnd}
              onChange={(e) => setRegEnd(e.target.value)}
              id='regEnd' className={styles.input} />
          </div>
        </div>

        {/* --- 4. FEE & PARTICIPANTS --- */}
        <div className={styles.row}>
          <div className={styles.col}>
            <label htmlFor="regFee" className={styles.label}>Registration Fee (₹):</label>
            <input type="number" value={fee} min="0"
              onChange={(e) => setFee(e.target.value)}
              id='regFee' className={styles.input} />
          </div>
          <div className={styles.col}>
            <label htmlFor="maxPart" className={styles.label}>Max Participants:</label>
            <input type="number" value={maxPart} min="0"
              placeholder='0 = No Limit'
              onChange={(e) => setMaxPart(e.target.value)}
              id='maxPart' className={styles.input} />
          </div>
        </div>

        {/* --- 5. CANCELLATION POLICY --- */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Allow Cancellation?
          </label>

          <div className={styles.radioGroup}>
            <div className={styles.radioOption}>
              <input
                type="radio"
                name="cancellation"
                id="cancelYes"
                checked={canCancel === true}
                onChange={() => setCanCancel(true)}
              />
              <label htmlFor="cancelYes">Yes</label>
            </div>

            <div className={styles.radioOption}>
              <input
                type="radio"
                name="cancellation"
                id="cancelNo"
                checked={canCancel === false}
                onChange={() => setCanCancel(false)}
              />
              <label htmlFor="cancelNo">No</label>
            </div>
          </div>
        </div>

        <button type='submit' className={styles.postBtn}>Post Event</button>
      </form>
    </section>
  )
}

export default CreateEvent;