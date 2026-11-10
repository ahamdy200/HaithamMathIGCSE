import React from 'react';

export const metadata = {
  title: 'AI Math Grader',
  description: 'AI-powered Mathematics Exam Grader with Multi-Provider Vision AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
