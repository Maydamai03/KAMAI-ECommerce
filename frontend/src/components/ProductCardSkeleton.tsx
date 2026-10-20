export default function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-neutral-200" />
      <div className="mt-3 h-4 w-3/4 bg-neutral-200" />
      <div className="mt-2 h-4 w-1/3 bg-neutral-200" />
    </div>
  );
}