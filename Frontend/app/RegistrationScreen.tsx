import React, { useState, useEffect } from 'react';

// --- Spinner Component ---
// This replaces React Native's ActivityIndicator with a web-friendly SVG spinner
const Spinner = ({ color = 'text-white' }) => (
  <svg
    className={`animate-spin h-5 w-5 ${color}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// --- Main App Component (My Account Screen) ---
// This has been converted from React Native to web-React to run in this environment
export default function App() {
  // --- State ---
  // State for the user's data
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');

  // State for loading and feedback
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // --- Effects ---
  // Simulate fetching data when the component mounts
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate an API call
    const timer = setTimeout(() => {
      const mockUserData = {
        username: 'JaneDoe_88',
        email: 'jane.doe@example.com',
        location: 'San Francisco, CA',
      };
      
      setUsername(mockUserData.username);
      setEmail(mockUserData.email);
      setLocation(mockUserData.location);
      setIsLoading(false);
    }, 1500); // 1.5 second delay

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Handlers ---
  const handleSave = () => {
    if (isSaving) return;

    setIsSaving(true);
    setMessage('');

    // Simulate an API call to save data
    console.log('Saving data:', { username, email, location });

    const saveTimer = setTimeout(() => {
      setIsSaving(false);
      setMessage('Changes saved successfully!');
      
      const messageTimer = setTimeout(() => {
        setMessage('');
      }, 3000);
      
      // Cleanup message timer
      return () => clearTimeout(messageTimer);
    }, 1000); // 1 second save delay
    
    // Cleanup save timer
    return () => clearTimeout(saveTimer);
  };

  // --- Render ---
  
  // Show a full-screen loading spinner while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center font-sans">
        <Spinner color="text-blue-600" />
        <p className="mt-4 text-lg text-gray-600">Loading Account...</p>
      </div>
    );
  }

  // Show the main account form
  return (
    <div className="min-h-screen bg-gray-100 font-sans p-6 antialiased">
      {/* This div simulates a mobile screen container.
        Tailwind CSS is assumed to be available in the environment.
      */}
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 mt-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Account</h1>
        <p className="text-base text-gray-600 mb-8">
          View and edit your account details below.
        </p>

        {/* --- Form --- */}
        <form 
          className="w-full space-y-5" 
          onSubmit={(e) => { 
            e.preventDefault(); // Prevent default form submission
            handleSave(); 
          }}
        >
          {/* Username Input */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              aria-label="Username"
            />
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              aria-label="Email"
            />
          </div>

          {/* Location Input */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              id="location"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your location"
              aria-label="Location"
            />
          </div>

          {/* --- Save Button --- */}
          <button
            type="submit"
            className={`w-full flex justify-center items-center gap-2 py-4 px-6 rounded-lg font-semibold text-lg text-white transition-all duration-300 shadow-md ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Spinner />
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>

        {/* --- Feedback Message --- */}
        {message ? (
          <div className="mt-6 p-4 bg-green-100 rounded-lg text-center">
            <p className="font-medium text-green-700">{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

