import React, { useState, useEffect, useRef } from "react";

interface GeminiHelperProps {
  geminiApiKey: string;
}

const GeminiHelper: React.FC<GeminiHelperProps> = ({ geminiApiKey }) => {
  const [currentElement, setCurrentElement] = useState<HTMLElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const helperButtonRef = useRef<HTMLButtonElement | null>(null);
  const helperMenuRef = useRef<HTMLDivElement | null>(null);

  const createHelperButton = () => {
    const button = document.createElement("button");
    button.className = "gemini-helper-button";
    button.textContent = "G";
    button.style.display = "none";
    document.body.appendChild(button);
    return button;
  };

  const createHelperMenu = () => {
    const menu = document.createElement("div");
    menu.className = "gemini-helper-menu";
    menu.style.display = "none";

    const grammarOption = document.createElement("div");
    grammarOption.className = "gemini-helper-menu-item";
    grammarOption.textContent = "Correct Grammar";
    grammarOption.onclick = (e: MouseEvent) => {
      e.stopPropagation();
      processText("correct grammar, only reply with the corrected phrase, without your comments. respond without parentheses on left and right sides. keep the original language");
    };

    const clarityOption = document.createElement("div");
    clarityOption.className = "gemini-helper-menu-item";
    clarityOption.textContent = "Improve Clarity";
    clarityOption.onclick = (e: MouseEvent) => {
      e.stopPropagation();
      processText("rewrite for clarity, respond with ONLY the text, rewritten for clarity, no comments; keep the original language");
    };

    menu.appendChild(grammarOption);
    menu.appendChild(clarityOption);
    document.body.appendChild(menu);
    return menu;
  };

  const processText = async (prompt: string) => {
    if (!currentElement) return;

    const text = currentElement.textContent || "";
    if (!text) return;

    setIsProcessing(true);
    if (helperButtonRef.current) {
      helperButtonRef.current.textContent = "";
      helperButtonRef.current.classList.add("gemini-helper-loading");
    }
    closeMenu();

    try {
      if (!geminiApiKey) {
        alert("Please set your Gemini API key in the extension settings");
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${prompt}: ${text}` }] }],
          }),
        }
      );

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();
      const improvedText = data.candidates[0].content.parts[0].text;

      if (currentElement instanceof HTMLTextAreaElement || currentElement instanceof HTMLInputElement) {
        currentElement.value = improvedText;
      } else {
        currentElement.textContent = improvedText;
      }
    } catch (error) {
      console.error("Error processing text:", error);
      alert("Error processing text. Please try again.");
    } finally {
      if (helperButtonRef.current) {
        helperButtonRef.current.textContent = "G";
        helperButtonRef.current.classList.remove("gemini-helper-loading");
      }
      setIsProcessing(false);

      // Hide button if element is no longer focused
      if (document.activeElement !== currentElement) {
        hideHelper();
      }
    }
  };

  const updateHelperPosition = (element: HTMLElement) => {
    if (!helperButtonRef.current || !helperMenuRef.current || !element) return;

    const rect = element.getBoundingClientRect();
    const buttonSize = 32;

    const top = rect.top + window.scrollY;
    const left = rect.right + window.scrollX;

    helperButtonRef.current.style.left = `${left - buttonSize}px`;
    helperButtonRef.current.style.top = `${top}px`;
    helperButtonRef.current.style.display = "flex";
    helperButtonRef.current.style.zIndex = "9999999";

    helperMenuRef.current.style.left = `${left - 10}px`;
    helperMenuRef.current.style.top = `${top + buttonSize - 8}px`;
    helperMenuRef.current.style.zIndex = "9999999";
  };

  const showHelper = (element: HTMLElement) => {
    setCurrentElement(element);
    updateHelperPosition(element);
  };

  const hideHelper = () => {
    if (isMenuOpen || isProcessing) return;
    if (helperButtonRef.current) helperButtonRef.current.style.display = "none";
    closeMenu();
  };

  const openMenu = () => {
    if (!helperMenuRef.current) return;
    setIsMenuOpen(true);
    helperMenuRef.current.style.display = "block";
  };

  const closeMenu = () => {
    if (!helperMenuRef.current) return;
    setIsMenuOpen(false);
    helperMenuRef.current.style.display = "none";
  };

  const handleElementFocus = (element: HTMLElement) => {
    if (
      element.tagName === "TEXTAREA" ||
      element.tagName === "INPUT" ||
      element.isContentEditable ||
      element.role === "textbox"
    ) {
      showHelper(element);
    }
  };

  const handleElementBlur = (event: FocusEvent) => {
    const relatedTarget = event.relatedTarget as HTMLElement; // Type assertion
  
    if (
      relatedTarget &&
      (relatedTarget.closest(".gemini-helper-button") || relatedTarget.closest(".gemini-helper-menu"))
    ) {
      return;
    }
  
    setTimeout(() => {
      if (!isMenuOpen && !isProcessing) {
        hideHelper();
      }
    }, 100);
  };
  

  const handleScroll = () => {
    if (currentElement && helperButtonRef.current && helperButtonRef.current.style.display !== "none") {
      updateHelperPosition(currentElement);
    }
  };

  const handleResize = () => {
    if (currentElement && helperButtonRef.current && helperButtonRef.current.style.display !== "none") {
      updateHelperPosition(currentElement);
    }
  };

  const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement; // Type assertion

  if (
    !target.closest(".gemini-helper-button") &&
    !target.closest(".gemini-helper-menu")
  ) {
    closeMenu();
    if (document.activeElement !== currentElement) {
      hideHelper();
    }
  }
};


  const handleButtonClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  useEffect(() => {
    const button = createHelperButton();
    const menu = createHelperMenu();

    helperButtonRef.current = button;
    helperMenuRef.current = menu;

    const handleFocus = (e: FocusEvent) => handleElementFocus(e.target as HTMLElement);
    const handleBlur = (e: FocusEvent) => handleElementBlur(e);

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    button.addEventListener("click", handleButtonClick);

    if (document.activeElement !== document.body) {
      handleElementFocus(document.activeElement as HTMLElement);
    }

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      button.removeEventListener("click", handleButtonClick);
    };
  }, [geminiApiKey]);

  return null;
};

export default GeminiHelper;
