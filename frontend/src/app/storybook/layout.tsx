export default function StorybookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      backgroundColor: '#fff'
    }}>
      {children}
    </div>
  );
}
