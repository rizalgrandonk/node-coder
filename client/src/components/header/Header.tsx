import { cn } from "@/utils/helper";
import { useState, useEffect } from "react";

const Header = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const username = "Aken Sejati";
  // Function to check if window is in full-screen mode based on size
  // Use effect to set up event listeners for resize
  useEffect(() => {
    const checkFullScreen = () => {
      const isFullscreenMode = window.innerHeight === window.screen.height;
      console.log(window.innerHeight, window.screen.height);
      setIsFullScreen(isFullscreenMode);
    };
    // Check on initial load
    checkFullScreen();

    window.addEventListener("resize", checkFullScreen);

    return () => {
      window.removeEventListener("resize", checkFullScreen);
    };
  }, []);

  return (
    <header
      data-testid="header-bar"
      className={cn(`bg-pastel-blue-100 p-4 flex justify-between items-center shadow-md transition-transform duration-300`, isFullScreen ? "hidden" : "")}
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <img src="/android-chrome-512x512.png" alt="Logo" className="w-10 aspect-square object-contain" />
        <h1 className="text-xl font-bold text-pastel-blue-700">Smile Coder</h1>
      </div>

      {/* User Profile */}
      <div className="flex items-center space-x-4">
        <img src="https://via.placeholder.com/40" alt="User Profile" className="w-10 h-10 rounded-full border border-pastel-blue-300" />
        <span className="text-pastel-blue-600 font-medium" data-testid="header-username">
          {username}
        </span>
      </div>
    </header>
  );
};

export default Header;
