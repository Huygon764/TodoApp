import { useEffect, useState } from "react";

function getIsMobile() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth < 768;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  return isMobile;
}
