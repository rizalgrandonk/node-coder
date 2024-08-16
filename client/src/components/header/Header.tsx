import { useState, useEffect } from "react";

const Header = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Function to check if window is in full-screen mode based on size
  const checkFullScreen = () => {
    const isFullscreenMode = window.innerHeight === window.screen.height;
    setIsFullScreen(isFullscreenMode);
  };

  // Use effect to set up event listeners for resize
  useEffect(() => {
    window.addEventListener("resize", checkFullScreen);

    // Check on initial load
    checkFullScreen();

    return () => {
      window.removeEventListener("resize", checkFullScreen);
    };
  }, []);

  return (
    <header className={`bg-pastel-blue-100 p-4 flex justify-between items-center shadow-md transition-transform duration-300 ${isFullScreen ? "hidden" : ""}`}>
      {/* Title */}
      <h1 className="text-xl font-bold text-pastel-blue-700">Coder App</h1>

      {/* User Profile */}
      <div className="flex items-center space-x-4">
        <img src="https://via.placeholder.com/40" alt="User Profile" className="w-10 h-10 rounded-full border border-pastel-blue-300" />
        <span className="text-pastel-blue-600 font-medium">Aken Sejati</span>
      </div>
    </header>
  );
};

export default Header;
