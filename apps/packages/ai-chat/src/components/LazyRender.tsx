import { useRef, useState, useEffect, type ReactNode } from "react";

interface LazyRenderProps {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}

export function LazyRender({ children, minHeight = 120, rootMargin = "200px" }: LazyRenderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (visible) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="flex items-center justify-center text-muted-foreground text-xs rounded-md bg-muted/20 animate-pulse"
      style={{ minHeight }}
    >
      Carregando...
    </div>
  );
}
