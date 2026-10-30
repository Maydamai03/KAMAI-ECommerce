export default function ProductCardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="aspect-[4/5] bg-neutral-200" />
      <div className="mt-3 h-5 w-3/4 bg-neutral-200" />
      <div className="mt-1 h-5 w-1/3 bg-neutral-200" />
    </div>
  );
}