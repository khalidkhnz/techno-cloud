import type { ReactNode } from "react";

export const metadata = {
  title: "Techno-Deployer",
  description: "Internal PaaS — deploy any repo to AWS.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
