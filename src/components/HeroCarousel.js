import React from "react";
import { Carousel } from "antd";

// Every slide is a real San Francisco / fleet photo — full-bleed with a
// bottom gradient and overlaid text.
const SLIDES = [
  {
    src: "/hero-golden-gate.jpg",
    pos: "center 55%",
    eyebrow: "Same-City Delivery",
    title: "Every Bridge, Every Block",
    subtitle: "CityDrop delivers across San Francisco — rain, shine, or fog.",
  },
  {
    src: "/hero-skyline.jpg",
    pos: "center 40%",
    eyebrow: "Built For The City",
    title: "From SoMa to the Marina",
    subtitle: "Same-day drop-offs anywhere in San Francisco.",
  },
  {
    src: "/hero-chinatown.jpg",
    pos: "center 35%",
    eyebrow: "Every Neighborhood",
    title: "Through Chinatown's Lanterns",
    subtitle: "From the Financial District to Chinatown, we know every block.",
  },
  {
    src: "/hero-drone-sunset.jpg",
    pos: "center 35%",
    eyebrow: "Drone Delivery",
    title: "Above the Rooftops",
    subtitle: "Beat rush hour — literally — with sky-fast drone drop-offs.",
  },
  {
    src: "/hero-lombard.jpg",
    pos: "center 30%",
    eyebrow: "Every Street Covered",
    title: "Even the Crookedest Street",
    subtitle: "No block too winding, no drop-off too tricky.",
  },
  {
    src: "/hero-steep-street.jpg",
    pos: "center 25%",
    eyebrow: "Hills? No Problem",
    title: "Every Steep Block",
    subtitle: "Our routes handle San Francisco's hills like they're flat.",
  },
  {
    src: "/hero-cablecar.jpg",
    pos: "center 45%",
    eyebrow: "Classic City, Modern Delivery",
    title: "As Reliable as the 13",
    subtitle: "Historic charm meets next-gen logistics.",
  },
  {
    src: "/hero-palace.jpg",
    pos: "center 40%",
    eyebrow: "Landmarks & Culture",
    title: "Past the Palace of Fine Arts",
    subtitle: "Same-city delivery, wherever San Francisco takes you.",
  },
  {
    src: "/hero-drone-closeup.jpg",
    pos: "center 50%",
    eyebrow: "Precision From Above",
    title: "Tracked Every Meter",
    subtitle: "Real-time flight tracking from dispatch to doorstep.",
  },
  {
    src: "/hero-highway.jpg",
    pos: "center 30%",
    eyebrow: "Beyond Downtown",
    title: "Highways Home",
    subtitle: "Same-city delivery that keeps moving, block after block.",
  },
  {
    src: "/hero-van.jpg",
    pos: "center 40%",
    eyebrow: "Ground Delivery",
    title: "Boxes On Board",
    subtitle: "Reliable ground transport backing up every drone and robot run.",
  },
];

function HeroCarousel({ user }) {
  return (
    <div className="hero-carousel-wrap">
      <Carousel className="hero-carousel" autoplay autoplaySpeed={5000}>
        {SLIDES.map((slide, i) => (
          <div key={i}>
            <div className="hero-slide">
              <div className="hero-slide-media">
                <img src={slide.src} alt="" style={{ objectPosition: slide.pos }} />
              </div>
              <div className="hero-slide-overlay" />
              <div className="hero-slide-topbar">
                <span className="hero-welcome">
                  {user ? `Welcome back, ${user}` : "Welcome"}
                </span>
                <span className="hero-welcome-sub">
                  What would you like to send today?
                </span>
              </div>
              <div className="hero-slide-text">
                <span className="hero-slide-eyebrow">{slide.eyebrow}</span>
                <h1>{slide.title}</h1>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  );
}

export default HeroCarousel;
