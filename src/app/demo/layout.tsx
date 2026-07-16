import { DemoBanner } from "@/components/demo-banner";

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-1">
      <DemoBanner />
      {children}
    </div>
  );
}
