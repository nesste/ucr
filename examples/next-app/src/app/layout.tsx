import type { ReactNode } from "react";

export const metadata = {
  title: "UCR Next Example",
  description: "Bun-managed Next App Router example composed from UCR blocks.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
