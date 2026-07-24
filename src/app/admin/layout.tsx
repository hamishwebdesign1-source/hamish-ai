export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground font-sans">{children}</div>;
}
