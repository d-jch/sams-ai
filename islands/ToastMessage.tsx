import { useEffect, useState } from "preact/hooks";

interface ToastMessageProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number; // milliseconds to show before fading
}

export default function ToastMessage({
  message,
  type = "success",
  duration = 1000,
}: ToastMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Fade out after specified duration
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, duration);

    // Clean URL after fade completes
    const cleanupTimer = setTimeout(() => {
      const url = new URL(globalThis.location.href);
      url.searchParams.delete("message");
      globalThis.history.replaceState({}, "", url.pathname + url.search);
    }, duration + 500); // Wait for fade animation

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(cleanupTimer);
    };
  }, [duration]);

  const alertClass = {
    success: "alert-success",
    error: "alert-error",
    info: "alert-info",
    warning: "alert-warning",
  }[type];

  const icon = type === "success"
    ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    )
    : null;

  return (
    <div
      class={`toast toast-top toast-center z-50 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div class={`alert ${alertClass}`}>
        {icon}
        <span>{message}</span>
      </div>
    </div>
  );
}
