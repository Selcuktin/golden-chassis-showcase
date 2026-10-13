import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Touch swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
      touchStartX.current = touch.clientX;
    }
    touchEndX.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
      touchEndX.current = touch.clientX;
    }
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // 45px threshold

    if (diff > minSwipeDistance) {
      // Swiped left -> next
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swiped right -> prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Görsel Büyüteç"}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl select-none animate-in fade-in duration-200"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5 truncate max-w-[70vw]">
          <ZoomIn className="h-4 w-4 text-primary shrink-0" />
          {title && (
            <span className="font-display text-sm sm:text-base font-semibold text-foreground truncate">
              {title}
            </span>
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-primary border border-primary/30 px-2 py-0.5 rounded-full shrink-0">
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Kapat"
          className="flex items-center justify-center h-9 w-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-primary hover:text-primary transition active:scale-95 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Önceki Fotoğraf"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-md shadow-2xl transition hover:border-primary hover:text-primary hover:bg-black/90 active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Current Enlarged Image */}
        <div
          className="relative max-h-full max-w-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            key={currentImage}
            src={currentImage}
            alt={title ? `${title} - Fotoğraf ${currentIndex + 1}` : `Fotoğraf ${currentIndex + 1}`}
            className="max-h-[76vh] max-w-[94vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Sonraki Fotoğraf"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-md shadow-2xl transition hover:border-primary hover:text-primary hover:bg-black/90 active:scale-90 cursor-pointer"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (Desktop & Mobile) */}
      {images.length > 1 && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/60 backdrop-blur-md z-10">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
            {images.map((src, idx) => (
              <button
                key={`${src}-${idx}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Fotoğraf ${idx + 1}`}
                className={`relative shrink-0 overflow-hidden rounded-md border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? "border-primary scale-105 shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img
                  src={src}
                  alt={`Küçük Önizleme ${idx + 1}`}
                  className="h-12 w-16 sm:h-14 sm:w-20 object-cover bg-black"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
