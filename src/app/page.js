"use client";

import { useEffect } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import { onScroll } from "animejs/events";

export default function LandingPage() {
  useEffect(() => {
    /* HERO INTRO */
    animate(".hero-item", {
      translateY: [30, 0],
      opacity: [0, 1],
      delay: stagger(150),
      duration: 900,
      easing: "easeOutExpo",
    });

    // Set up Intersection Observer for timeline items
    const timelineObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target, {
            translateX: [-30, 0],
            opacity: [0, 1],
            duration: 700,
            easing: "easeOutCubic",
          });
          timelineObserver.unobserve(entry.target); // Stop observing after animation
        }
      });
    }, { threshold: 0.1 }); // Trigger when 10% of element is visible

    // Set up Intersection Observer for feature cards
    const featureObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target, {
            scale: [0.95, 1],
            opacity: [0, 1],
            duration: 600,
            easing: "easeOutBack",
          });
          featureObserver.unobserve(entry.target); // Stop observing after animation
        }
      });
    }, { threshold: 0.1 }); // Trigger when 10% of element is visible

    // Observe timeline items
    document.querySelectorAll(".timeline-item").forEach((item) => {
      timelineObserver.observe(item);
    });

    // Observe feature cards
    document.querySelectorAll(".feature-card").forEach((card) => {
      featureObserver.observe(card);
    });

    // Cleanup observers when component unmounts
    return () => {
      timelineObserver.disconnect();
      featureObserver.disconnect();
    };
  }, []);

  return (
    <main className="bg-[#0b0b0f] text-white overflow-x-hidden">
      {/* HERO */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-6">
        <h1 className="hero-item text-5xl md:text-6xl font-bold">
          MSME Invoice Marketplace
        </h1>

        <p className="hero-item mt-6 max-w-2xl text-gray-400 text-lg">
          A blockchain-powered platform where MSME invoices are tokenized and
          purchased directly by investors using Ethereum.
        </p>

        {/* AUTH CTA */}
        <div className="hero-item mt-10 flex gap-4 flex-wrap justify-center">
          <Link
            href="/auth/signup"
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
          >
            Sign Up
          </Link>

          <Link
            href="/auth/login"
            className="px-8 py-3 rounded-xl border border-slate-700 hover:border-indigo-500 transition font-semibold text-gray-300"
          >
            Login
          </Link>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-semibold text-center mb-20">
          How the System Works
        </h2>

        <div className="space-y-24">
          {[
            ["01", "Invoice Upload", "MSMEs upload verified invoices with buyer details."],
            ["02", "On-Chain Listing", "Invoices are listed on Ethereum with fixed ETH price."],
            ["03", "Investor Purchase", "Investors buy invoices using MetaMask."],
            ["04", "Instant Settlement", "Smart contract transfers ETH directly to MSMEs."],
          ].map(([step, title, desc]) => (
            <div key={step} className="timeline-item flex gap-8 items-start opacity-0">
              <span className="text-indigo-500 text-2xl font-bold">{step}</span>
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-gradient-to-b from-[#0b0b0f] to-[#111827]">
        <h2 className="text-3xl font-semibold text-center mb-16">
          Why Blockchain?
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 px-6">
          {[
            "Trustless & Transparent Transactions",
            "No Middlemen or Delays",
            "Fully Auditable Smart Contracts",
          ].map((text, i) => (
            <div
              key={i}
              className="feature-card opacity-0 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"
            >
              <p className="text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-gray-500 text-sm">
        Built for Hackathons • Ethereum • MSME Empowerment
      </footer>
    </main>
  );
}
