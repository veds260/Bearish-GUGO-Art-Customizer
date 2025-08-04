import NextAbstractWalletProvider from '@/components/NextAbstractWalletProvider';

export const metadata = {
  title: 'GUGO × Bearish Customizer',
  description: 'Premium NFT Customization on Abstract',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <NextAbstractWalletProvider>
          {children}
        </NextAbstractWalletProvider>
      </body>
    </html>
  )
}