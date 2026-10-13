import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CARS } from "../lib/bycar";
import { ImageLightboxModal } from "../components/ImageLightboxModal";

describe("ByCar Fleet & ImageLightboxModal Verification", () => {
  it("fleet has at least 10 cars and all are active", () => {
    expect(CARS.length).toBeGreaterThanOrEqual(10);
    const activeCars = CARS.filter((c) => c.status === "active");
    expect(activeCars.length).toBe(15);

    // Each car must have at least 4 angle images
    for (const car of CARS) {
      expect(car.images.length).toBeGreaterThanOrEqual(4);
      for (const img of car.images) {
        expect(img).toMatch(/^\/cars\//);
      }
    }
  });

  it("renders ImageLightboxModal and navigates images with arrows", () => {
    const images = [
      "/cars/cupra-formentor/1.jpg",
      "/cars/cupra-formentor/2.jpg",
      "/cars/cupra-formentor/3.jpg",
    ];
    const onClose = vi.fn();

    const { rerender } = render(
      <ImageLightboxModal
        isOpen={true}
        onClose={onClose}
        images={images}
        initialIndex={0}
        title="2023 Cupra Formentor"
      />,
    );

    // Checks title and initial counter
    expect(screen.getByText("2023 Cupra Formentor")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Click next arrow
    const nextBtn = screen.getByLabelText("Sonraki Fotoğraf");
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // Click previous arrow
    const prevBtn = screen.getByLabelText("Önceki Fotoğraf");
    fireEvent.click(prevBtn);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByLabelText("Kapat");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Re-render closed
    rerender(
      <ImageLightboxModal isOpen={false} onClose={onClose} images={images} initialIndex={0} />,
    );
    expect(screen.queryByText("1 / 3")).not.toBeInTheDocument();
  });
});
