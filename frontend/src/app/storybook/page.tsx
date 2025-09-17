'use client';

export default function StorybookPage() {
  return (
    <iframe
      src="/storybook-static/index.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
      }}
      title="Storybook"
    />
  );
}
