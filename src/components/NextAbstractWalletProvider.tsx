'use client';

import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstract } from "viem/chains"; // Using abstract mainnet for GUGO tokens

export default function NextAbstractWalletProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <AbstractWalletProvider chain={abstract}>
      {children}
    </AbstractWalletProvider>
  );
}