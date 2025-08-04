'use client';

import dynamic from "next/dynamic";

const Customizer = dynamic(() => import("@/components/Customizer"), { ssr: false });


export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-neutral-900 text-white">
  
  <Customizer />
</main>

  );
}